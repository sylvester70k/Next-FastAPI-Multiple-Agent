import { toast } from "sonner";
import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader } from "lucide-react";
import { useAtom } from "jotai";
import {
  chatHistoryAtom,
  isStartChatAtom,
  researchStepAtom,
  activeChatIdAtom,
  fileAtom,
  chatLogAtom,
  sessionIdAtom,
  isStreamingAtom,
  researchLogAtom,
  chatTypeAtom,
  progressAtom,
  isResearchAreaVisibleAtom,
  chatModeAtom,
  routerModelAtom,
  modelTypeAtom,
  routerModelsAtom
} from "@/lib/store";
import { generateSessionId, processResponse } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { IResearchLog, IFileWithUrl } from "@/lib/interface";
import PlusIcon from "@/assets/plus";
import ShadowBtn from "./ShadowBtn";
import { useAuth } from "@/context/AuthContext";
import DialogModelMenu from "./DialogModelMenu";
import ChatFileMenu from "./ChatFileMenu";
import ChatSettingMenu from "./ChatSettingMenu";
import { X } from "lucide-react";
import { ProDisableIcon } from "@/assets/pro";
import Lightning from "@/assets/lightning";
import { Credits } from "@/lib/stack";

const TEXTAREA_MIN_HEIGHT = "36px";
const TEXTAREA_MAX_HEIGHT = "100px";

// Custom Divider component using Tailwind CSS
const CustomDivider = () => {
  return <div className="h-full w-[2px] bg-[#25252799]" />;
};

const InputBox = () => {
  const [isStartChat, setIsStartChat] = useAtom(isStartChatAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setMessageOver] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isStreaming, setIsStreaming] = useAtom(isStreamingAtom);
  const [, setResearchLog] = useAtom(researchLogAtom);
  const [, setResearchStep] = useAtom(researchStepAtom);
  const [, setProgress] = useAtom(progressAtom);
  const [, setIsResearchAreaVisible] = useAtom(isResearchAreaVisibleAtom);
  const [, setActiveChatId] = useAtom(activeChatIdAtom);
  const [textareaWidth, setTextareaWidth] = useState<number>(0);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState<boolean>(false);
  const [chatType, setChatType] = useAtom(chatTypeAtom);
  const [isFileUploading, setIsFileUploading] = useState<boolean>(false);
  const [chatMode, setChatMode] = useAtom(chatModeAtom);
  const [routerModel,] = useAtom(routerModelAtom);
  const [routerModels, ] = useAtom(routerModelsAtom);
  const [modelType,] = useAtom(modelTypeAtom);
  const [chatLog, setChatLog] = useAtom(chatLogAtom);
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [imageSupport, setImageSupport] = useState<boolean>(false);
  const { data: session } = useSession();
  const [, setChatHistory] = useAtom(chatHistoryAtom);
  const { user, setUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useAtom<IFileWithUrl[]>(fileAtom);
  const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const timer = useRef<number>(0)

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = TEXTAREA_MIN_HEIGHT;
      textarea.style.height = `${Math.min(
        textarea.scrollHeight,
        parseInt(TEXTAREA_MAX_HEIGHT)
      )}px`;
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/user/profile`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        signOut();
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      signOut();
    }
  }

  useEffect(() => {
    setTextareaWidth(textareaRef.current?.clientWidth || 0);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(generateSessionId(session?.user?.email as string, Date.now().toString()));
    }
  }, [sessionId]);

  useEffect(() => {
    if (routerModels.length > 0) {
      const imageSupport = routerModels.find((model) => model._id == routerModel)?.imageSupport || false;
      setImageSupport(imageSupport);
      if (!imageSupport) {
        if (files.find((file) => file.file.type.startsWith("image/"))) {
          toast.error('Image files are not supported for this model.');
        }
        setFiles(files.filter((file) => !file.file.type.startsWith("image/")));
      }
    }
  }, [routerModels, routerModel]);

  useEffect(() => {
    if (modelType == "image") {
      setChatType(0);
    } else if (modelType == "audio") {
      setChatType(0);
    }
  }, [modelType]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setInputPrompt(newPrompt);
    adjustTextareaHeight();
    // Observe if text is over a line
    const textWidth = newPrompt.length * 8;
    setMessageOver(textWidth > textareaWidth * 0.8);
  };

  const keyDownHandler = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isStreaming && !isFileUploading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const filesArray = Array.from(selectedFiles);
      const totalSize = filesArray.reduce((acc, file) => acc + file.size, 0);

      if (totalSize > MAX_TOTAL_FILE_SIZE) {
        toast.error('Total file size exceeds the 10 MB limit.');
        return;
      }

      let uploadFiles = filesArray.filter((file) => {
        return !files.some(
          (prevFile) => prevFile.file.name === file.name && prevFile.file.size === file.size
        );
      });

      if (!imageSupport) {
        uploadFiles = uploadFiles.filter((file) => !file.type.startsWith("image/"));
        if (uploadFiles.length == 0) {
          toast.error('Image files are not supported for this model.');
          return;
        }
      }

      const fileUrls = await fileUpload(uploadFiles);

      setFiles((prevFiles) => {
        return [...prevFiles, ...fileUrls];
      });

      // Disable Pro Search when a file is uploaded
      setChatType(0);
    }
    event.target.value = '';
  };

  const fileUpload = async (fileData: File[]) => {
    setIsFileUploading(true);
    const formData = new FormData();
    fileData.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      console.log('Files uploaded successfully:', result);
      if (!result.success) {
        throw new Error('Failed to upload files');
      }

      const uploadedResult = fileData.map((file, index) => ({ file, url: result.fileUrl[index] as string }));
      return uploadedResult;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleClickSend = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleSendMessage = async () => {
    timer.current = Number(Date.now().toString());
    if (inputPrompt === "") {
      toast.error('Enter a message to send');
      return;
    }

    if (!routerModel) {
      toast.error('Please select a model');
      return;
    }

    setIsStreaming(true);
    setIsStartChat(true);
    let requestSessionId = sessionId;
    if (!requestSessionId) {
      const newId = generateSessionId(
        session?.user?.email as string,
        Date.now().toString()
      );
      setSessionId(newId);
      requestSessionId = newId;
    }
    if (chatLog.length == 0) {
      setChatHistory((prevChatHistory) => {
        const newChatHistory = [...prevChatHistory];
        newChatHistory.push({
          id: requestSessionId as string,
          title: inputPrompt,
          chats: [
            {
              prompt: inputPrompt,
              response: "",
              timestamp: Date.now().toString(),
              chatType: chatType,
              inputToken: 0,
              outputToken: 0,
              fileUrls: [],
              model: routerModel,
              points: 0
            }
          ],
        });
        return newChatHistory;
      });
    }
    // else {
    //   setChatHistory((prevChatHistory) => {
    //     const newChatHistory = [...prevChatHistory];
    //     const chat = newChatHistory.find((chat) => chat.id === requestSessionId);
    //     // if (chat) {
    //     //   chat.loading = true;
    //     // }
    //     return newChatHistory;
    //   });
    // }
    try {
      setInputPrompt("");

      if (chatType === 0 || files.length > 0) {
        setIsResearchAreaVisible(false);
        await sendMessage(inputPrompt, [], requestSessionId);
      } else {
        setProgress(0);
        await generateResearch(inputPrompt, requestSessionId);
      }
    } finally {
      setIsStreaming(false);
      setInputPrompt("");
      setMessageOver(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/chat/history");
      const data = await res.json();
      if (data.success) {
        setChatHistory(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const sendMessage = async (prompt: string, learnings: string[], requestSessionId: string, time = 0) => {
    if (learnings.length == 0) {
      setIsResearchAreaVisible(false);
    }

    const newChatType = modelType == "image" ? 3 : modelType == "audio" ? 4 : chatMode == 1 ? 2 : learnings.length > 0 ? 1 : 0;
    const fileLists = imageSupport ? files.map((file) => file.url) : files.filter((file) => !file.file.type.startsWith("image/")).map((file) => file.url);

    try {
      if (learnings.length == 0) {
        setChatLog((prevChatLog) => {
          const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
          newLog.push({
            prompt,
            response: "",
            timestamp: Date.now().toString(),
            chatType: newChatType,
            inputToken: 0,
            outputToken: 0,
            outputTime: 0,
            fileUrls: fileLists,
            model: routerModel,
            points: 0
          });
          console.log("Updated chatLog:", newLog);
          return newLog;
        });
      }

      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("sessionId", requestSessionId);
      formData.append("chatLog", JSON.stringify(chatLog.slice(-5)));
      formData.append("reGenerate", "false");
      formData.append("learnings", JSON.stringify(learnings));
      formData.append("time", time.toString());
      formData.append("fileUrls", JSON.stringify(fileLists));
      formData.append("model", routerModel);
      formData.append("chatMode", chatMode.toString());
      formData.append("modelType", modelType);

      if (chatMode === 1 || modelType == "image" || modelType == "audio") {
        const res = await fetch("/api/chat/generateText", {
          method: "POST",
          body: formData,
        });
        if (res.status == 429) {
          throw new Error('Insufficient Points');
        }
        if (res.status == 500) {
          throw new Error('Error generating text');
        }

        const data = await res.json();
        const { mainResponse, points, outputTime, error } = processResponse(data.content);
        if (error) {
          toast.error("Rate limit exceeded");
          throw new Error('Rate limit exceeded');
        }
        setChatLog((prevChatLog) => {
          const newLog = [...prevChatLog];
          newLog[newLog.length - 1].response = mainResponse;
          newLog[newLog.length - 1].inputToken = data.inputToken;
          newLog[newLog.length - 1].outputToken = data.outputToken;
          newLog[newLog.length - 1].outputTime = outputTime ? Number(outputTime) : 0;
          newLog[newLog.length - 1].chatType = newChatType;
          newLog[newLog.length - 1].fileUrls = fileLists;
          newLog[newLog.length - 1].points = points ? Number(points) : 0;
          return newLog;
        });
      } else {
        const res = await fetch("/api/chat/generateText", {
          method: "POST",
          body: formData,
        });
        setProgress(100);

        if (res.status == 429) {
          throw new Error('Insufficient Points');
        }

        if (!res.body) {
          console.error("No response body");
          throw new Error('No response body');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullResponse = "";
        const buffer = "";
        const newChat = chatLog.length == 0 ? true : false;

        try {
          // Process each streamed chunk
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the incoming chunk and add it to our buffer.
            const chunk = decoder.decode(value, { stream: true });
            // const { content, inputToken, outputToken, inputTime, outputTime } = await processChunkedString(chunk);
            // fullResponse += content;
            fullResponse += chunk;

            const { mainResponse, points, outputTime, error } = processResponse(fullResponse);
            if (error) {
              toast.error("Rate limit exceeded");
              throw new Error('Rate limit exceeded');
            }

            setChatLog((prevChatLog) => {
              const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
              if (newLog.length > 0) {
                newLog[newLog.length - 1] = {
                  prompt,
                  response: mainResponse,
                  timestamp: newLog[newLog.length - 1].timestamp,
                  inputToken: 0,
                  outputToken: 0,
                  chatType: newChatType,
                  fileUrls: fileLists,
                  model: routerModel,
                  points: points ? Number(points) : 0,
                  outputTime: outputTime ? Number(outputTime) : 0
                };
              } else {
                newLog.push({
                  prompt,
                  response: mainResponse,
                  timestamp: Date.now().toString(),
                  inputToken: 0,
                  outputToken: 0,
                  chatType: newChatType,
                  fileUrls: fileLists,
                  model: routerModel,
                  points: points ? Number(points) : 0,
                  outputTime: outputTime ? Number(outputTime) : 0
                });
              }
              return newLog;
            });
          }

          if (buffer.trim() !== "") {
            // const { content, inputToken, outputToken, inputTime, outputTime } = await processChunkedString(buffer);
            fullResponse += buffer;
            const { mainResponse, points, outputTime, error } = processResponse(fullResponse);
            if (error) {
              toast.error("Rate limit exceeded");
              throw new Error('Rate limit exceeded');
            }
            setChatLog((prevChatLog) => {
              const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
              if (newLog.length > 0) {
                newLog[newLog.length - 1] = {
                  prompt,
                  response: mainResponse ? mainResponse : " ",
                  timestamp: newLog[newLog.length - 1].timestamp,
                  inputToken: 0,
                  outputToken: 0,
                  chatType: newChatType,
                  fileUrls: fileLists,
                  model: routerModel,
                  points: points ? Number(points) : 0,
                  outputTime: outputTime ? Number(outputTime) : 0
                };
              } else {
                newLog.push({
                  prompt,
                  response: mainResponse ? mainResponse : " ",
                  timestamp: Date.now().toString(),
                  inputToken: 0,
                  outputToken: 0,
                  chatType: newChatType,
                  fileUrls: fileLists,
                  model: routerModel,
                  points: points ? Number(points) : 0,
                  outputTime: outputTime ? Number(outputTime) : 0
                });
              }
              return newLog;
            });
          }
        } finally {
          // Always release the reader's lock.
          reader.releaseLock();
          if (newChat) {
            fetchHistory();
          }
        }
      }
      fetchUserData();
    } catch (error) {
      console.error("Error sending message:", error);
      setChatLog((prevChatLog) => {
        const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
        if (newLog.length > 0) {
          newLog[newLog.length - 1] = {
            prompt,
            response: error instanceof Error ? error.message : 'Failed to get response from server.',
            timestamp: newLog[newLog.length - 1].timestamp,
            inputToken: 0,
            outputToken: 0,
            outputTime: 0,
            chatType: newChatType,
            fileUrls: [],
            model: routerModel,
            points: 0
          };
        } else {
          newLog.push({
            prompt,
            response: "Failed to get response from server.",
            timestamp: Date.now().toString(),
            inputToken: 0,
            outputToken: 0,
            outputTime: 0,
            chatType: newChatType,
            fileUrls: [],
            model: routerModel,
            points: 0
          });
        }
        return newLog;
      });
      toast.error(error instanceof Error ? error.message : 'Failed to get response from server.');
    }
  };

  const generateResearch = async (prompt: string, requestSessionId: string) => {
    let time = 0;
    const startTime = Date.now();
    setIsResearchAreaVisible(true);
    setActiveChatId(requestSessionId);

    try {
      setChatLog((prevChatLog) => {
        const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
        newLog.push({
          prompt,
          response: "",
          timestamp: Date.now().toString(),
          chatType: chatType,
          inputToken: 0,
          outputToken: 0,
          outputTime: 0,
          fileUrls: [],
          model: routerModel,
          points: 0
        });
        return newLog;
      });
      setProgress(0);
      setResearchLog([]);
      setResearchStep(0);
      const res = await fetch("/api/chat/generateResearchSteps", {
        method: "POST",
        body: JSON.stringify({ prompt, chatLog: chatLog.slice(-5) }),
      });
      if (res.status == 429) {
        const msg = await res.json();
        setChatLog((prevChatLog) => {
          const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
          if (newLog.length > 0) {
            newLog[newLog.length - 1] = {
              prompt,
              response: "Failed to get response from server.",
              timestamp: newLog[newLog.length - 1].timestamp,
              inputToken: 0,
              outputToken: 0,
              outputTime: 0,
              chatType: chatType,
              fileUrls: [],
              model: routerModel,
              points: 0
            };
          } else {
            newLog.push({
              prompt,
              response: "Failed to get response from server.",
              timestamp: Date.now().toString(),
              inputToken: 0,
              outputToken: 0,
              outputTime: 0,
              chatType: chatType,
              fileUrls: [],
              model: routerModel,
              points: 0
            });
          }
          return newLog;
        });
        toast.error(`You've already used your ${user?.currentplan.price == 0 ? Credits.free : Credits.pro} credits per month. Please try again after ${msg.availableInDays} days.`);
        return;
      }
      const data = await res.json();
      const topics = JSON.parse(data.topics).topics;
      const totalProgress = topics.length * 2;
      const newResearchLog = [];
      setProgress(10);

      for (const topic of topics) {
        newResearchLog.push({
          title: topic,
          researchSteps: [],
          sources: [],
          learnings: []
        });
      }

      newResearchLog.push({
        title: "compile research result",
        researchSteps: [],
        sources: [],
        learnings: []
      });

      // Create a new log array based on the current state
      setResearchLog(newResearchLog);
      time = Date.now() - startTime;
      await handleResearchStep(0, 0, newResearchLog, totalProgress, time, requestSessionId);
    } catch (error) {
      console.error(error);
      toast.error('Failed to get response from server.');
      setChatLog((prevChatLog) => {
        const newLog = prevChatLog && prevChatLog.length > 0 ? [...prevChatLog] : [];
        if (newLog.length > 0) {
          newLog[newLog.length - 1] = {
            prompt,
            response: "Failed to get response from server.",
            timestamp: newLog[newLog.length - 1].timestamp,
            inputToken: 0,
            outputToken: 0,
            outputTime: 0,
            chatType: chatType,
            fileUrls: [],
            model: newLog[newLog.length - 1].model,
            points: newLog[newLog.length - 1].points
          };
        } else {
          newLog.push({
            prompt,
            response: "Failed to get response from server.",
            timestamp: Date.now().toString(),
            inputToken: 0,
            outputToken: 0,
            outputTime: 0,
            chatType: chatType,
            fileUrls: [],
            model: routerModel,
            points: 0
          });
        }
        return newLog;
      });
    }
  };

  const handleResearchStep = async (researchStepIndex: number, stepIndex: number, log: IResearchLog[], totalProgress: number, time: number, requestSessionId: string) => {
    try {
      if (researchStepIndex == log.length - 1) {
        const learnings = log.flatMap((step) => step.learnings.map((learning) => learning));
        log[researchStepIndex].researchSteps.push({
          type: 1,
          researchStep: "Compiling research result..."
        });
        await sendMessage(inputPrompt, learnings, requestSessionId, time);
        setResearchStep(researchStepIndex + 1);
      } else {
        console.log(researchStepIndex, stepIndex);
        const researchStep = log[researchStepIndex];
        log[researchStepIndex].researchSteps.push({
          type: 1,
          researchStep: stepIndex == 0 ? "Searching resources..." : "Reading resources..."
        });
        setResearchLog((prevLog) => {
          const newLog = [...prevLog];
          newLog[researchStepIndex].researchSteps[stepIndex] =
            stepIndex == 0 ? {
              type: 1,
              researchStep: "Searching resources..."
            } : {
              type: 1,
              researchStep: "Reading resources..."
            };
          return newLog;
        });
        if (stepIndex == 0) {
          const startTime = Date.now();
          const res = await fetch("/api/chat/searchingResources", {
            method: "POST",
            body: JSON.stringify({ title: researchStep.title }),
          });
          const data = await res.json();
          time += Date.now() - startTime;
          setProgress(Math.floor((researchStepIndex * 2 + 1) / totalProgress * 80) + 10);
          console.log(data);
          log[researchStepIndex].sources = data.results.flatMap((result: { urls: string[], contents: string[], images: string[], titles: string[] }) =>
            result.urls.map((url: string, index: number) => ({
              url,
              image: result.images[index],
              title: result.titles[index],
              content: result.contents[index]
            }))
          );
          setResearchLog((prevLog) => {
            // Create a deep copy of the previous log to avoid direct mutation
            const newLog = prevLog.map((logItem, index) => {
              if (index === researchStepIndex) {
                return {
                  ...logItem,
                  sources: data.results.flatMap((result: { urls: string[], contents: string[], images: string[], titles: string[] }) =>
                    result.urls.map((url: string, index: number) => ({
                      url,
                      image: result.images[index],
                      title: result.titles[index],
                      content: result.contents[index]
                    }))
                  )
                };
              }
              return logItem;
            });
            return newLog;
          });
          await handleResearchStep(researchStepIndex, 1, log, totalProgress, time, requestSessionId);
        } else {
          const startTime = Date.now();
          const res = await fetch("/api/chat/analyzingResources", {
            method: "POST",
            body: JSON.stringify({ sources: researchStep.sources, title: researchStep.title }),
          });
          const data = await res.json();
          time += Date.now() - startTime;
          log[researchStepIndex].learnings = data.learningDatas;
          setResearchLog((prevLog) => {
            const newLog = [...prevLog];
            newLog[researchStepIndex].learnings = data.learningDatas;
            return newLog;
          });
          setProgress(Math.floor((researchStepIndex * 2 + 2) / totalProgress * 80) + 10);
          setResearchStep(researchStepIndex + 1);
          await handleResearchStep(researchStepIndex + 1, 0, log, totalProgress, time, requestSessionId);
        }
      }
    } catch (error) {
      console.error(error);
      setResearchLog((prevLog) => {
        const newLog = [...prevLog];
        newLog[researchStepIndex].researchSteps.push({
          type: 0,
          researchStep: "Failed to get response from server."
        });
        return newLog;
      });
      throw error;
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((_, i) => i !== index);
      return updatedFiles;
    });
  };

  const handleClickPlusIcon = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`${isStartChat ? "w-full" : ""
        } bg-box-bg mt-[10px] w-full lg:max-w-[700px] border rounded-[12px] md:rounded-[24px] border-[#25252799] flex flex-col shadow-input-box`}
    >
      <div className="flex flex-col py-2">
        <div className="flex w-full justify-between items-center px-4 py-2">
          <textarea
            ref={textareaRef}
            className={`${isStreaming ? '' : "text-mainFont"} bg-transparent pt-2 border-none w-full h-[36px] font-semibold text-base placeholder:text-[#FFFFFF33] overflow-y-hidden outline-none resize-none`}
            placeholder="How can EDITH help you today?"
            onKeyDown={keyDownHandler}
            value={inputPrompt}
            onChange={(e) => handleChange(e)}
            translate="no"
            disabled={isStreaming || isFileUploading}
            style={{
              minHeight: TEXTAREA_MIN_HEIGHT,
              maxHeight: TEXTAREA_MAX_HEIGHT,
            }}
          />
          <button
            className={`${isStreaming || isFileUploading ? "opacity-50 cursor-not-allowed" : ""} flex items-center justify-center p-2 rounded-full border-secondaryBorder bg-input-box hover:border-tertiaryBorder focus:outline-none w-9 h-9 text-mainFont sm:hidden`}
            onClick={(e) => handleClickSend(e)}
            disabled={isStreaming || isFileUploading}
          >
            {isStreaming ? (
              <Loader className="w-auto h-full animate-spin text-black" />
            ) : (
              <ArrowUp className="w-auto h-full text-black" />
            )}
          </button>
        </div>
      </div>
      <div className="py-2 px-3 md:px-4 flex gap-1 justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {
              isFileUploading ? (
                <ShadowBtn
                  className="rounded-full"
                  mainClassName="border-[#2C2B30] border shadow-btn-google w-[38px] h-[38px] text-white py-2 px-2 gap-0 rounded-full flex flex-col items-center justify-center"
                  disabled={true}
                >
                  <Loader className="w-auto h-full animate-spin text-black" />
                </ShadowBtn>
              ) :
                files.length > 0 ? (
                  <ChatFileMenu
                    files={files}
                    handleClickPlusIcon={handleClickPlusIcon}
                    handleRemoveFile={handleRemoveFile}
                    setFiles={setFiles}
                    isFileMenuOpen={isFileMenuOpen}
                    setIsFileMenuOpen={setIsFileMenuOpen}
                  />
                ) : (
                  <ShadowBtn
                    className="rounded-full bg-transparent hover:bg-btn-shadow"
                    mainClassName="hover:border-[#2C2B30] hover:border bg-transparent hover:bg-[#292929] shadow-btn-google w-[38px] h-[38px] text-white py-2 px-2 gap-0 rounded-full flex flex-col items-center justify-center"
                    onClick={handleClickPlusIcon}
                  >
                    <PlusIcon />
                  </ShadowBtn>
                )
            }
            <input
              type="file"
              accept={`.pdf,.csv,.xlsx,.xls,.doc,.docx,.text,.txt,.json,.html,.xml,.css,.js${imageSupport ? ",image/*" : ""}`}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              ref={fileInputRef}
              multiple
            />
            <ChatSettingMenu files={files} />
          </div>
          <CustomDivider />
          {
            chatType == 1 && (
              <>
                <ShadowBtn
                  className="rounded-md ml-2 max-sm:hidden"
                  mainClassName="rounded-md border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white py-2 px-2 gap-0 text-sm flex items-center justify-center gap-[6px]"
                >
                  <ProDisableIcon />
                  <span className="ml-2">Pro Search</span>
                  <X className="w-4 h-4 ml-4" onClick={() => setChatType(0)} />
                </ShadowBtn>
                <ShadowBtn
                  onClick={() => setChatType(0)}
                  className="rounded-full ml-2 sm:hidden"
                  mainClassName="rounded-full border-[#2C2B30] w-[38px] h-[38px] border bg-[#292929] shadow-btn-google text-white py-2 px-2 gap-0 text-sm flex items-center justify-center gap-[6px]"
                >
                  <ProDisableIcon />
                </ShadowBtn>
              </>
            )
          }
          {
            chatMode == 1 && (
              <>
                <ShadowBtn
                  className="rounded-md ml-2 max-sm:hidden"
                  mainClassName="rounded-md border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white py-2 px-2 gap-0 text-sm flex items-center justify-center gap-[6px]"
                >
                  <div className="w-[15px] h-[15px] text-transparent">
                    <Lightning />
                  </div>
                  <span>Faster x30</span>
                  <X className="w-4 h-4 ml-4" onClick={() => setChatMode(0)} />
                </ShadowBtn>
                <ShadowBtn
                  onClick={() => setChatMode(0)}
                  className="rounded-full ml-2 sm:hidden"
                  mainClassName="rounded-full border-[#2C2B30] w-[38px] h-[38px] border bg-[#292929] shadow-btn-google text-white py-2 px-2 gap-0 text-sm flex items-center justify-center gap-[6px]"
                >
                  <div className="text-transparent">
                    <Lightning />
                  </div>
                </ShadowBtn>
              </>
            )
          }
        </div>
        <div className="sm:hidden">
          <DialogModelMenu />
        </div>
        <button
          className={`${isStreaming || isFileUploading ? "opacity-50 cursor-not-allowed" : ""} flex items-center justify-center p-2 rounded-full border-secondaryBorder bg-input-box hover:border-tertiaryBorder focus:outline-none w-9 h-9 text-mainFont max-sm:hidden`}
          onClick={(e) => handleClickSend(e)}
          disabled={isStreaming || isFileUploading}
        >
          {isStreaming ? (
            <Loader className="w-auto h-full animate-spin text-black" />
          ) : (
            <ArrowUp className="w-auto h-full text-black" />
          )}
        </button>
      </div>
    </div >
  )
};

export default InputBox;
