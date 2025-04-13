import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { useEffect, useState } from "react";
import McpAgentView from "./components/mcp-agent-view";
import McpToolsForm from "./components/mcp-tools-form";
import McpToolsView from "./components/mcp-tools-view";
import { Agent, McpFile } from "./types";
import { getDescription } from "./utils";

export default function Command() {
  const { push } = useNavigation();
  const mcpDir = path.join(homedir(), "Library", "Application Support", "Raycast", "extensions", "mcp-manager", "data");
  const templateDir = path.join(mcpDir, "templates");
  const [mcpFiles, setMcpFiles] = useState<McpFile[]>([]);
  const [templates, setTemplates] = useState<Agent[]>([]);

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
    } catch {
      return [];
    }
  };

  // 템플릿 목록 읽기
  const getTemplates = (): Agent[] => {
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
    } catch {
      return [];
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
          <Action
            title="Create New Mcp Tools"
            onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {currentView === "tools" ? (
        <McpToolsView
          mcpFiles={mcpFiles}
          setTemplates={setTemplates}
          updateMcpFiles={updateMcpFiles}
          getTemplates={getTemplates}
        />
      ) : (
        <McpAgentView
          templates={templates}
          setTemplates={setTemplates}
          getTemplates={getTemplates}
          templateDir={templateDir}
        />
      )}
    </List>
  );
}
