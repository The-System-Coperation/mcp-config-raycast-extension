import { ActionPanel, List, Action, showToast, Toast, Form, useNavigation, Icon } from "@raycast/api";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { useState, useEffect } from "react";

interface McpContent {
  mcpServers?: Record<string, any>;
}

interface McpFile {
  name: string;
  content: string;
  filePath: string;
}

interface Template {
  name: string;
  files: Array<{
    name: string;
    content: McpContent;
  }>;
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
  const mcpDir = path.join(homedir(), "Desktop", "mcp");
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
    } catch (e) {
      setJsonError("유효하지 않은 JSON 형식입니다");
      return false;
    }
  };

  const handleSubmit = (values: { name: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      const fileName = values.name.endsWith(".json") ? values.name : `${values.name}.json`;
      const filePath = path.join(mcpDir, fileName);

      // 기존 파일이 있고 이름이 변경된 경우 기존 파일 삭제
      if (existingFile && existingFile.name !== fileName) {
        fs.unlinkSync(existingFile.filePath);
      }

      // JSON 파일 저장
      fs.writeFileSync(filePath, JSON.stringify(JSON.parse(values.content), null, 2));

      // 부모 컴포넌트에 저장 완료 알림
      onSave();

      showToast({
        title: existingFile ? "수정 완료" : "저장 완료",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "저장 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        style: Toast.Style.Failure,
      });
    }
  };

  const applyCursor = (values: { name: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      fs.writeFileSync(cursorMcpPath, values.content);
      showToast({
        title: "Cursor MCP 파일 업데이트 완료",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Cursor MCP 파일 업데이트 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingFile ? "수정" : "저장"} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Cursor Mcp에 적용"
            onSubmit={applyCursor}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="파일 이름"
        placeholder="example.json"
        defaultValue={existingFile?.name}
        info="파일 확장자(.json)는 자동으로 추가됩니다"
      />
      <Form.TextArea
        id="content"
        title="JSON 내용"
        placeholder='{
  "key": "value"
}'
        defaultValue={existingFile?.content || defaultContent}
        error={jsonError}
        onChange={(value) => validateJson(value)}
        info="유효한 JSON 형식이어야 합니다"
      />
    </Form>
  );
}

// 템플릿 저장 폼
// @todo: 저장 위치 수정 필요
function TemplateForm({ files, onSave }: { files: McpFile[]; onSave: () => void }) {
  const templateDir = path.join(homedir(), "Desktop", "mcp", "templates");

  useEffect(() => {
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
  }, []);

  const handleSubmit = (values: { name: string }) => {
    try {
      const templateName = values.name.endsWith(".json") ? values.name : `${values.name}.json`;
      const templatePath = path.join(templateDir, templateName);

      // 파일들을 병합
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

      const templateContent = {
        files: [
          {
            name: templateName,
            content: mergedContent,
          },
        ],
      };

      fs.writeFileSync(templatePath, JSON.stringify(templateContent, null, 2));
      onSave();

      showToast({
        title: "템플릿 저장 완료",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "템플릿 저장 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Mcp Agent 저장" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="MCP Agent 이름"
        placeholder="my-mcp-agent.json"
        info="MCP Agent 이름을 입력하세요"
      />
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const mcpDir = path.join(homedir(), "Desktop", "mcp");
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
        .filter((file) => file.endsWith(".json"))
        .map((file) => {
          const filePath = path.join(mcpDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          return {
            name: file,
            content,
            filePath,
          };
        });
    } catch (error) {
      console.error("MCP 파일 읽기 실패:", error);
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
          };
        });
    } catch (error) {
      console.error("MCP Agent 읽기 실패:", error);
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
            ? "선택된 파일들이 Cursor와 Claude에 성공적으로 적용되었습니다"
            : `선택된 파일들이 ${target === "cursor" ? "Cursor" : "Claude"}에 성공적으로 적용되었습니다`,
        style: Toast.Style.Success,
      });

      // 선택 초기화
      setSelectedFiles(new Set());
    } catch (error) {
      showToast({
        title: "파일 병합 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
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
        title: "Mcp Agent가 Cursor와 Claude에 성공적으로 적용되었습니다",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Mcp Agent 적용 실패",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
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
      updateMcpFiles();
      showToast({
        title: "삭제 완료",
        style: Toast.Style.Success,
      });
    } catch (e) {
      showToast({
        title: "삭제 실패",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="보기 선택"
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
              title="새 Mcp Tools 생성"
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
            title="MCP 파일이 없습니다"
            description="새로운 MCP 파일을 생성해보세요"
            icon="✨"
            actions={
              <ActionPanel>
                <Action
                  title="새 Mcp 파일 생성"
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
                title={file.name}
                subtitle={file.content}
                accessories={[
                  {
                    icon: selectedFiles.has(file.name) ? Icon.CircleProgress100 : Icon.Circle,
                    tooltip: selectedFiles.has(file.name) ? "선택됨" : "선택되지 않음",
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
                      title={selectedFiles.has(file.name) ? "선택 해제" : "선택"}
                      onAction={() => {
                        const newSelected = new Set(selectedFiles);
                        if (selectedFiles.has(file.name)) {
                          newSelected.delete(file.name);
                        } else {
                          newSelected.add(file.name);
                        }
                        setSelectedFiles(newSelected);
                      }}
                      icon={selectedFiles.has(file.name) ? Icon.CircleProgress100 : Icon.Circle}
                    />
                    <Action
                      title="수정"
                      onAction={() => push(<McpToolsForm existingFile={file} onSave={updateMcpFiles} />)}
                      icon={{ source: "✏️" }}
                    />
                    <Action
                      title="새 Mcp Tools 생성"
                      onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action title="Mcp Agent 적용" onAction={() => mergeMcpFiles("both")} icon={Icon.CheckCircle} />
                    <Action
                      title="Mcp Agent 저장"
                      onAction={() => {
                        // 선택된 모든 파일을 가져옴
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
                      title="삭제"
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
            title="MCP Agent가 없습니다"
            description="파일을 선택하여 새로운 MCP Agent를 만들어보세요"
            icon="✨"
          />
          <List.Section>
            {templates.map((template) => (
              <List.Item
                key={template.name}
                title={template.name}
                subtitle={`${template.files.length}개의 파일`}
                detail={
                  <List.Item.Detail
                    markdown={`### 포함된 파일:\n${template.files
                      .map(
                        (file) => `\n#### ${file.name}\n\`\`\`json\n${JSON.stringify(file.content, null, 2)}\n\`\`\``,
                      )
                      .join("\n")}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Mcp Agent 적용" onAction={() => applyTemplate(template)} icon={Icon.CheckCircle} />
                    <Action
                      title="삭제"
                      onAction={() => {
                        const templatePath = path.join(templateDir, template.name);
                        fs.unlinkSync(templatePath);
                        setTemplates(getTemplates());
                        showToast({
                          title: "Mcp Agent 삭제 완료",
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
