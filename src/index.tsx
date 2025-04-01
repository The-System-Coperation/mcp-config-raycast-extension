import { ActionPanel, List, Action, showToast, Toast, Form, useNavigation, Icon } from "@raycast/api";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { useState, useEffect } from "react";
import React from "react";

interface McpContent {
  mcpServers?: Record<
    string,
    {
      tools: Array<{
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
      }>;
    }
  >;
  description?: string;
}

interface McpFile {
  name: string;
  content: string;
  filePath: string;
  description?: string;
}

interface Template {
  name: string;
  files: Array<{
    name: string;
    content: McpContent;
  }>;
  description?: string;
}

// description 파일 읽기 함수
function getDescription(filePath: string): string {
  try {
    const descriptionPath = `${filePath}.description`;
    if (fs.existsSync(descriptionPath)) {
      return fs.readFileSync(descriptionPath, "utf-8");
    }
    return "";
  } catch {
    return "";
  }
}

// Mcp Tools 생성/수정 폼
function McpToolsForm({
  existingFile,
  onSave,
  defaultContent,
}: {
  existingFile?: McpFile;
  onSave: () => void;
  defaultContent?: string;
}) {
  const [jsonError, setJsonError] = useState<string>("");
  const mcpDir = path.join(homedir(), "Library", "Application Support", "Raycast", "extensions", "mcp-manager", "data");
  const cursorMcpPath = path.join(homedir(), ".cursor", "mcp.json");

  useEffect(() => {
    // MCP 디렉토리 생성
    if (!fs.existsSync(mcpDir)) {
      fs.mkdirSync(mcpDir, { recursive: true });
    }
    // .cursor 디렉토리 생성
    const cursorDir = path.join(homedir(), ".cursor");
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }
  }, []);

  const validateJson = (value: string): boolean => {
    try {
      JSON.parse(value);
      setJsonError("");
      return true;
    } catch {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleSubmit = (values: { name: string; description: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      const fileName = values.name.endsWith(".json") ? values.name : `${values.name}.json`;
      const filePath = path.join(mcpDir, fileName);

      // 기존 파일이 있고 이름이 변경된 경우 기존 파일 삭제
      if (existingFile && existingFile.name !== fileName) {
        fs.unlinkSync(existingFile.filePath);
      }

      // JSON 파일 저장 (description 제외)
      const contentObj = JSON.parse(values.content);
      fs.writeFileSync(filePath, JSON.stringify(contentObj, null, 2));

      // description을 별도 파일로 저장
      const descriptionPath = path.join(mcpDir, `${fileName}.description`);
      fs.writeFileSync(descriptionPath, values.description);

      // 부모 컴포넌트에 저장 완료 알림
      onSave();

      showToast({
        title: existingFile ? "Update Complete" : "Save Complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Save Failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  const applyCursor = (values: { name: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      fs.writeFileSync(cursorMcpPath, values.content);
      showToast({
        title: "Cursor MCP file update complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Cursor MCP file update failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingFile ? "Update" : "Save"} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Apply to Cursor Mcp"
            onSubmit={applyCursor}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="File Name"
        placeholder="my-mcp-tools"
        defaultValue={existingFile?.name.replace(/\.json$/, "")}
        info="File extension (.json) will be added automatically"
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter a description for your MCP Tools"
        defaultValue={existingFile ? getDescription(existingFile.filePath) : ""}
      />
      <Form.TextArea
        id="content"
        title="JSON Content"
        placeholder='{
  "key": "value"
}'
        defaultValue={existingFile?.content || defaultContent}
        error={jsonError}
        onChange={(value) => validateJson(value)}
        info="Must be valid JSON format"
        enableMarkdown={false}
      />
    </Form>
  );
}

// 템플릿 저장 폼
// @todo: 저장 위치 수정 필요
function TemplateForm({ files, onSave }: { files: McpFile[]; onSave: () => void }) {
  const templateDir = path.join(
    homedir(),
    "Library",
    "Application Support",
    "Raycast",
    "extensions",
    "mcp-manager",
    "data",
    "templates",
  );
  const [jsonError, setJsonError] = useState<string>("");

  // 초기 JSON 내용 생성
  const initialContent = React.useMemo(() => {
    if (files.length === 0) return "";

    const mergedContent: McpContent = {
      mcpServers: {},
    };

    files.forEach((file) => {
      const content = JSON.parse(file.content);
      if (content.mcpServers) {
        mergedContent.mcpServers = {
          ...mergedContent.mcpServers,
          ...content.mcpServers,
        };
      }
    });

    return JSON.stringify(mergedContent, null, 2);
  }, [files]);

  useEffect(() => {
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
  }, []);

  const validateJson = (value: string): boolean => {
    try {
      JSON.parse(value);
      setJsonError("");
      return true;
    } catch {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleSubmit = (values: { name: string; description: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      const templateName = values.name.endsWith(".json") ? values.name : `${values.name}.json`;
      const templatePath = path.join(templateDir, templateName);

      const content = JSON.parse(values.content);
      const templateContent = {
        description: values.description,
        files: [
          {
            name: templateName,
            content: content,
          },
        ],
      };

      fs.writeFileSync(templatePath, JSON.stringify(templateContent, null, 2));
      onSave();

      showToast({
        title: "MCP Agent save complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "MCP Agent save failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save as Mcp Agent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="MCP Agent Name"
        placeholder="my-mcp-agent"
        info={files.length > 0 ? `Will be created from ${files.length} selected files` : "Enter MCP Agent name"}
      />
      <Form.TextField id="description" title="Description" placeholder="Enter a description for your MCP Agent" />
      <Form.TextArea
        id="content"
        title="JSON Content"
        defaultValue={initialContent}
        placeholder='{
  "mcpServers": {
    "your-server-name": {
      "tools": []
    }
  }
}'
        error={jsonError}
        onChange={(value) => validateJson(value)}
        info="Must be valid JSON format"
        enableMarkdown={false}
        autoFocus={true}
      />
      {files.length > 0 && (
        <Form.Description
          title="Included Files"
          text={files.map((file) => file.name.replace(/\.json$/, "")).join(", ")}
        />
      )}
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const mcpDir = path.join(homedir(), "Library", "Application Support", "Raycast", "extensions", "mcp-manager", "data");
  const templateDir = path.join(mcpDir, "templates");
  const [mcpFiles, setMcpFiles] = useState<McpFile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<"tools" | "agent">("agent");

  // MCP 파일 목록 읽기
  const getMcpFiles = (): McpFile[] => {
    try {
      if (!fs.existsSync(mcpDir)) {
        fs.mkdirSync(mcpDir, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(mcpDir);
      return files
        .filter((file) => file.endsWith(".json") && !file.endsWith(".description"))
        .map((file) => {
          const filePath = path.join(mcpDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const description = getDescription(filePath);
          return {
            name: file,
            content,
            filePath,
            description,
          };
        });
    } catch (error) {
      console.error("Failed to read MCP files:", error);
      return [];
    }
  };

  // 템플릿 목록 읽기
  const getTemplates = (): Template[] => {
    try {
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(templateDir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => {
          const filePath = path.join(templateDir, file);
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          return {
            name: file,
            files: content.files,
            description: content.description,
          };
        });
    } catch (error) {
      console.error("Failed to read MCP Agent:", error);
      return [];
    }
  };

  // 선택된 파일들을 하나의 JSON으로 병합
  const mergeMcpFiles = (target: "cursor" | "claude" | "both" = "both") => {
    try {
      const mergedContent: McpContent = {
        mcpServers: {},
      };

      mcpFiles
        .filter((file) => selectedFiles.has(file.name))
        .forEach((file) => {
          const content = JSON.parse(file.content);
          if (content.mcpServers) {
            mergedContent.mcpServers = {
              ...mergedContent.mcpServers,
              ...content.mcpServers,
            };
          }
        });

      const cursorMcpPath = path.join(homedir(), ".cursor", "mcp.json");
      const claudeMcpPath = path.join(
        homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );

      // Cursor MCP 적용
      if (target === "cursor" || target === "both") {
        fs.writeFileSync(cursorMcpPath, JSON.stringify(mergedContent, null, 2));
      }

      // Claude MCP 적용
      if (target === "claude" || target === "both") {
        const claudeDir = path.join(homedir(), "Library", "Application Support", "Claude");
        if (!fs.existsSync(claudeDir)) {
          fs.mkdirSync(claudeDir, { recursive: true });
        }
        fs.writeFileSync(claudeMcpPath, JSON.stringify(mergedContent, null, 2));
      }

      showToast({
        title:
          target === "both"
            ? "Selected files have been successfully applied to Cursor and Claude"
            : `Selected files have been successfully applied to ${target === "cursor" ? "Cursor" : "Claude"}`,
        style: Toast.Style.Success,
      });

      // 선택 초기화
      setSelectedFiles(new Set());
    } catch (error) {
      showToast({
        title: "File merge failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  // 템플릿 적용
  const applyTemplate = (template: Template) => {
    try {
      const mergedContent: McpContent = {
        mcpServers: {},
      };

      template.files.forEach((file) => {
        if (file.content.mcpServers) {
          mergedContent.mcpServers = {
            ...mergedContent.mcpServers,
            ...file.content.mcpServers,
          };
        }
      });

      const cursorMcpPath = path.join(homedir(), ".cursor", "mcp.json");
      const claudeMcpPath = path.join(
        homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );

      // Cursor MCP 적용
      fs.writeFileSync(cursorMcpPath, JSON.stringify(mergedContent, null, 2));

      // Claude MCP 적용
      const claudeDir = path.join(homedir(), "Library", "Application Support", "Claude");
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(claudeMcpPath, JSON.stringify(mergedContent, null, 2));

      showToast({
        title: "MCP Agent has been successfully applied to Cursor and Claude",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "MCP Agent application failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  // 파일 목록 업데이트
  const updateMcpFiles = () => {
    setMcpFiles(getMcpFiles());
  };

  // 초기 파일 목록 로드
  useEffect(() => {
    updateMcpFiles();
    setTemplates(getTemplates());
  }, []);

  const handleDelete = (file: McpFile) => {
    try {
      fs.unlinkSync(file.filePath);
      // description 파일도 삭제
      const descriptionPath = `${file.filePath}.description`;
      if (fs.existsSync(descriptionPath)) {
        fs.unlinkSync(descriptionPath);
      }
      updateMcpFiles();
      showToast({
        title: "Delete complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          storeValue={true}
          value={currentView}
          onChange={(value) => setCurrentView(value as "tools" | "agent")}
        >
          <List.Dropdown.Item title="MCP Agent" value="agent" />
          <List.Dropdown.Item title="MCP Tools" value="tools" />
        </List.Dropdown>
      }
      navigationTitle={currentView === "tools" ? "MCP Tools" : "MCP Agent"}
      actions={
        <ActionPanel>
          {currentView === "tools" && (
            <Action
              title="Create New Mcp Tools"
              onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
        </ActionPanel>
      }
    >
      {currentView === "tools" ? (
        <>
          <List.EmptyView
            title="No MCP files"
            description="Create a new MCP file"
            icon="✨"
            actions={
              <ActionPanel>
                <Action
                  title="Create New Mcp File"
                  onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
          <List.Section>
            {mcpFiles.map((file) => (
              <List.Item
                key={file.name}
                title={file.name.replace(/\.json$/, "")}
                subtitle={file.description || undefined}
                accessories={[
                  {
                    icon: selectedFiles.has(file.name) ? Icon.CircleProgress100 : Icon.Circle,
                    tooltip: selectedFiles.has(file.name) ? "Selected" : "Not selected",
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`\`\`\`json\n${JSON.stringify(JSON.parse(file.content), null, 2)}\n\`\`\``}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Apply to Cursor and Claude"
                      onAction={() => mergeMcpFiles("both")}
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action title="Apply to Cursor" onAction={() => mergeMcpFiles("cursor")} icon={Icon.CheckCircle} />
                    <Action title="Apply to Claude" onAction={() => mergeMcpFiles("claude")} icon={Icon.CheckCircle} />
                    <Action
                      title="Edit"
                      onAction={() => push(<McpToolsForm existingFile={file} onSave={updateMcpFiles} />)}
                      icon={Icon.Pencil}
                    />
                    <Action
                      title="Save as Mcp Agent"
                      onAction={() => {
                        const filesToSave =
                          selectedFiles.size > 0 ? mcpFiles.filter((f) => selectedFiles.has(f.name)) : [file];

                        push(
                          <TemplateForm
                            files={filesToSave}
                            onSave={() => {
                              setTemplates(getTemplates());
                              setSelectedFiles(new Set());
                            }}
                          />,
                        );
                      }}
                      icon={Icon.SaveDocument}
                    />
                    <Action
                      title="Delete"
                      onAction={() => handleDelete(file)}
                      style={Action.Style.Destructive}
                      icon={Icon.Trash}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          <List.EmptyView
            title="No MCP Agents"
            description="Select files to create a new MCP Agent"
            icon="✨"
            actions={
              <ActionPanel>
                <Action
                  title="Create New Mcp Agent"
                  onAction={() => push(<TemplateForm files={[]} onSave={() => setTemplates(getTemplates())} />)}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
          <List.Section>
            {templates.map((template) => (
              <List.Item
                key={template.name}
                title={template.name.replace(/\.json$/, "")}
                subtitle={template.description || undefined}
                detail={
                  <List.Item.Detail
                    markdown={`\n${template.files
                      .map((file) => `\`\`\`json\n${JSON.stringify(file.content, null, 2)}\n\`\`\``)
                      .join("\n")}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Apply to Cursor and Claude"
                      onAction={() => applyTemplate(template)}
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action
                      title="Edit"
                      onAction={() => push(<TemplateForm files={[]} onSave={() => setTemplates(getTemplates())} />)}
                      icon={Icon.Pencil}
                    />
                    <Action
                      title="Delete"
                      onAction={() => {
                        const templatePath = path.join(templateDir, template.name);
                        fs.unlinkSync(templatePath);
                        setTemplates(getTemplates());
                        showToast({
                          title: "MCP Agent delete complete",
                          style: Toast.Style.Success,
                        });
                      }}
                      style={Action.Style.Destructive}
                      icon={Icon.Trash}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
