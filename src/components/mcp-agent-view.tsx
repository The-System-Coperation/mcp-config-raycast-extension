import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import McpAgentForm from "./mcp-agent-form";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { Agent, McpContent } from "../types";

const McpAgentView = ({
  templates,
  setTemplates,
  getTemplates,
  templateDir,
}: {
  templates: Agent[];
  setTemplates: (templates: Agent[]) => void;
  getTemplates: () => Agent[];
  templateDir: string;
}) => {
  const { push } = useNavigation();

  // 템플릿 적용
  const applyTemplate = (template: Agent) => {
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
  return (
    <>
      <List.EmptyView
        title="No MCP Agents"
        description="Select files to create a new MCP Agent"
        icon="✨"
        actions={
          <ActionPanel>
            <Action
              title="Create New Mcp Agent"
              onAction={() => push(<McpAgentForm files={[]} onSave={() => setTemplates(getTemplates())} />)}
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
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action
                  title="Edit"
                  onAction={() => {
                    const templateContent = JSON.parse(fs.readFileSync(path.join(templateDir, template.name), "utf-8"));
                    push(
                      <McpAgentForm
                        files={[]}
                        existingTemplate={{
                          name: template.name,
                          description: template.description || "",
                          content: templateContent.files[0].content,
                        }}
                        onSave={() => setTemplates(getTemplates())}
                      />,
                    );
                  }}
                  icon={Icon.Pencil}
                />
                <Action
                  title="Create New Mcp Agent"
                  onAction={() => push(<McpAgentForm files={[]} onSave={() => setTemplates(getTemplates())} />)}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
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
  );
};

export default McpAgentView;
