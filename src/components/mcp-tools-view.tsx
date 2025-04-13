import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import McpToolsForm from "./mcp-tools-form";
import McpAgentForm from "./mcp-agent-form";
import { Agent, McpContent, McpFile } from "../types";
import { useState } from "react";
import { homedir } from "os";
import path from "path";
import fs from "fs";

const McpToolsView = ({
  mcpFiles,
  setTemplates,
  updateMcpFiles,
  getTemplates,
}: {
  mcpFiles: McpFile[];
  setTemplates: (templates: Agent[]) => void;
  updateMcpFiles: () => void;
  getTemplates: () => Agent[];
}) => {
  const { push } = useNavigation();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

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
              <List.Item.Detail markdown={`\`\`\`json\n${JSON.stringify(JSON.parse(file.content), null, 2)}\n\`\`\``} />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Apply to Cursor and Claude"
                  onAction={() => mergeMcpFiles("both")}
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action title="Apply to Cursor" onAction={() => mergeMcpFiles("cursor")} icon={Icon.CheckCircle} />
                <Action title="Apply to Claude" onAction={() => mergeMcpFiles("claude")} icon={Icon.CheckCircle} />
                <Action
                  title="Edit"
                  onAction={() => push(<McpToolsForm existingFile={file} onSave={updateMcpFiles} />)}
                  icon={Icon.Pencil}
                />
                <Action
                  title="Create New Mcp Tools"
                  onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Save as Mcp Agent"
                  onAction={() => {
                    const filesToSave =
                      selectedFiles.size > 0 ? mcpFiles.filter((f) => selectedFiles.has(f.name)) : [file];

                    push(
                      <McpAgentForm
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
  );
};

export default McpToolsView;
