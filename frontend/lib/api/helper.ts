import crypto from 'crypto';
import { Session, User as NextAuthUser, Account, Profile } from 'next-auth';
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyConfirmationToken, generateConfirmationToken } from '@/lib/api/token';
import { UserRepo } from '@/lib/database/userrepo';
import emailjs from '@emailjs/nodejs';
import { emailUserID } from '@/lib/config';
import { JWT } from 'next-auth/jwt';
import { getEncoding } from 'js-tiktoken';
import { RecursiveCharacterTextSplitter } from '@/lib/api/text-splitter';
import { ChatHistory } from '@/lib/interface';
import { NextRequest } from 'next/server';
const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

export function generateInviteCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // Generates 6 hex characters
}

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            httpOptions: {
                timeout: 10000,
            }
        }),
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials) {
                console.log("credentials", credentials);
                if (!credentials) {
                    return null;
                }
                const { email, password } = credentials;
                try {
                    const user = await UserRepo.authenticate(email, password);
                    return user;
                } catch (error) {
                    console.log("error", error);
                    return null;
                }

            }
        }),
        CredentialsProvider({
            id: 'token',
            name: 'JWT-Token',
            credentials: {
                token: {}
            },
            async authorize(credentials) {
                if (!credentials) {
                    return null;
                }
                const { token } = credentials;
                try {
                    const decoded = await verifyConfirmationToken(token);
                    if (!decoded) {
                        return null;
                    }
                    const user = await UserRepo.findByEmail(decoded.email as string);
                    if (user && user.verify) {
                        return user;
                    } else {
                        return null;
                    }
                } catch (error) {
                    console.log("error", error);
                    return null;
                }
            }
        })
    ],
    pages: {
        error: '/verify',
        signIn: '/signin',
        signOut: '/signout',
    },
    session: {
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET!,
    debug: true,
    callbacks: {
        async signIn({ user, account, profile }: { user: NextAuthUser, account: Account, profile: Profile }) {
            console.log("profile", profile, user);
            if (account?.provider === 'google') {
                let existingUser = await UserRepo.findByEmail(profile?.email as string);
                if (existingUser && existingUser.verify == true) {
                    user.name = existingUser.name;
                    user.email = existingUser.email;
                    return true;
                }

                if (!existingUser) {
                    const token = await generateConfirmationToken(profile?.email as string, "google");
                    const inviteCode = await UserRepo.createUniqueInviteCode();
                    existingUser = await UserRepo.create({
                        email: profile?.email as string,
                        verify: false,
                        inviteCode: inviteCode,
                        numsOfUsedInviteCode: 0,
                        loginType: 'google',
                        lastLogin: new Date(),
                        logins: 0,
                        role: 'user',
                        name: profile?.name as string,
                        wallet: "",
                        chatPoints: 0,
                        workerPoints: 0,
                        // board: [],
                        nodeRewardHash: generateNodeRewardHash(),
                        pointsUsed: 0,
                        pointResetDate: new Date(),
                    });

                    const magicLink = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;
                    const templateParams = {
                        to_name: "dear",
                        from_name: "ChatEdith",
                        logo_url: process.env.LOGO_URL,
                        recipient: profile?.email as string,
                        message: magicLink,
                    };

                    await emailjs.send(
                        process.env.EMAILJS_SERVICE_ID!,
                        process.env.EMAILJS_TEMPLATE_ID!,
                        templateParams,
                        emailUserID
                    );
                    return false;
                } else if (!existingUser.verify) {
                    const token = await generateConfirmationToken(user.email as string, "google");
                    const magicLink = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;
                    const templateParams = {
                        to_name: "dear",
                        from_name: "ChatEdith",
                        logo_url: process.env.LOGO_URL,
                        recipient: existingUser.email as string,
                        message: magicLink,
                    };

                    await emailjs.send(
                        process.env.EMAILJS_SERVICE_ID!,
                        process.env.EMAILJS_TEMPLATE_ID!,
                        templateParams,
                        emailUserID
                    );
                    return false;
                }
            } else if (account?.provider === 'twitter' || account?.provider === 'discord') {
                return true;
            }
            return true;
        },
        async jwt({ token, account, user }: { token: JWT, account: Account, user: NextAuthUser }) {
            if (account) {
                token.accessToken = account.access_token
                token.name = user.name;
                token.email = user.email;
            }
            return token
        },
        async session({ session, token }: { session: Session, token: JWT }) {
            if (session.user) {
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                session.user.image = token.image as string;
            }
            return session;
        },
    },
};

export function trimPrompt(
    prompt: string,
    contextSize = Number(process.env.CONTEXT_SIZE) || 128_000,
) {
    if (!prompt) {
        return '';
    }

    const length = encoder.encode(prompt).length;
    if (length <= contextSize) {
        return prompt;
    }

    const overflowTokens = length - contextSize;
    // on average it's 3 characters per token, so multiply by 3 to get a rough estimate of the number of characters
    const chunkSize = prompt.length - overflowTokens * 3;
    if (chunkSize < MinChunkSize) {
        return prompt.slice(0, MinChunkSize);
    }

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap: 0,
    });
    const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

    // last catch, there's a chance that the trimmed prompt is same length as the original prompt, due to how tokens are split & innerworkings of the splitter, handle this case by just doing a hard cut
    if (trimmedPrompt.length === prompt.length) {
        return trimPrompt(prompt.slice(0, chunkSize), contextSize);
    }

    // recursively trim until the prompt is within the context size
    return trimPrompt(trimmedPrompt, contextSize);
}

export function getChatPoints(chatHistory: ChatHistory[]) {
    const chatLogCount = chatHistory.reduce((acc, curr) => acc + curr.chats.length, 0);

    return 0.2 * chatLogCount;
}

export function generateNodeRewardHash() {
    return crypto.randomBytes(32).toString('hex');
}

export async function checkAdmin(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyConfirmationToken(token);
    if (!decodedToken) {
        return false;
    }

    const id = decodedToken.email;
    const user = await UserRepo.findById(id as string);
    if (!user) {
        return false;
    }
    if (user.role !== "admin") {
        return false;
    }
    return true;
}