import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ModevolPlugin from './main';
import { LabelConfig } from './settings';

export class ModevolSettingTab extends PluginSettingTab {
    plugin: ModevolPlugin;

    constructor(app: App, plugin: ModevolPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Modevol 标签配置' });

        // 添加说明
        containerEl.createEl('p', {
            text: '自定义标签字母、颜色和图标。修改后需要重新打开文档才能看到效果。',
            cls: 'setting-item-description'
        });

        // 添加新标签按钮
        new Setting(containerEl)
            .setName('添加新标签')
            .setDesc('创建一个新的自定义标签')
            .addButton(button => button
                .setButtonText('添加标签')
                .setCta()
                .onClick(() => {
                    this.addNewLabel();
                }));

        // 显示所有标签配置
        this.plugin.settings.labels.forEach((label, index) => {
            this.createLabelSetting(containerEl, label, index);
        });

        // 导入导出功能
        containerEl.createEl('h3', { text: '导入/导出配置' });

        new Setting(containerEl)
            .setName('导出配置')
            .setDesc('将当前标签配置导出为 JSON 文件')
            .addButton(button => button
                .setButtonText('导出')
                .onClick(() => {
                    this.exportSettings();
                }));

        new Setting(containerEl)
            .setName('导入配置')
            .setDesc('从 JSON 文件导入标签配置')
            .addButton(button => button
                .setButtonText('导入')
                .onClick(() => {
                    this.importSettings();
                }));
    }

    createLabelSetting(containerEl: HTMLElement, label: LabelConfig, index: number): void {
        const settingDiv = containerEl.createDiv({ cls: 'modevol-label-setting' });

        // 标签标题
        settingDiv.createEl('h4', { text: `标签 #${label.key}` });

        // 启用/禁用开关
        new Setting(settingDiv)
            .setName('启用')
            .setDesc('是否启用此标签')
            .addToggle(toggle => toggle
                .setValue(label.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.labels[index].enabled = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStyles();
                }));

        // 标签字母
        new Setting(settingDiv)
            .setName('标签字母')
            .setDesc('单个字母，如 d, s, q')
            .addText(text => text
                .setPlaceholder('输入单个字母')
                .setValue(label.key)
                .onChange(async (value) => {
                    // 验证输入
                    if (value.length !== 1 || !/^[a-z]$/i.test(value)) {
                        new Notice('标签字母必须是单个英文字母');
                        return;
                    }
                    // 检查重复
                    const duplicate = this.plugin.settings.labels.some((l, i) =>
                        i !== index && l.key === value.toLowerCase()
                    );
                    if (duplicate) {
                        new Notice('标签字母已存在');
                        return;
                    }
                    this.plugin.settings.labels[index].key = value.toLowerCase();
                    await this.plugin.saveSettings();
                    this.plugin.refreshStyles();
                    this.display(); // 重新显示以更新标题
                }));

        // 显示名称
        new Setting(settingDiv)
            .setName('显示名称')
            .setDesc('标签的中文名称，如"描述"、"总结"')
            .addText(text => text
                .setPlaceholder('输入显示名称')
                .setValue(label.name)
                .onChange(async (value) => {
                    this.plugin.settings.labels[index].name = value;
                    await this.plugin.saveSettings();
                }));

        // 颜色选择
        new Setting(settingDiv)
            .setName('文本颜色')
            .setDesc('标签的文本颜色')
            .addColorPicker(color => color
                .setValue(label.color)
                .onChange(async (value) => {
                    this.plugin.settings.labels[index].color = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStyles();
                    this.updatePreview(settingDiv, this.plugin.settings.labels[index]);
                }));

        // SVG 图标
        new Setting(settingDiv)
            .setName('SVG 图标')
            .setDesc('标签的 SVG 图标代码（用于阅读模式）')
            .addTextArea(text => {
                text.setPlaceholder('粘贴 SVG 代码')
                    .setValue(label.svgIcon)
                    .onChange(async (value) => {
                        this.plugin.settings.labels[index].svgIcon = value;
                        await this.plugin.saveSettings();
                        this.updatePreview(settingDiv, this.plugin.settings.labels[index]);
                    });
                text.inputEl.rows = 4;
                text.inputEl.style.fontFamily = 'monospace';
                text.inputEl.style.fontSize = '12px';
            });

        // 预览
        const previewDiv = settingDiv.createDiv({ cls: 'modevol-label-preview' });
        this.updatePreview(previewDiv, label);

        // 删除按钮
        new Setting(settingDiv)
            .addButton(button => button
                .setButtonText('删除此标签')
                .setWarning()
                .onClick(async () => {
                    if (confirm(`确定要删除标签 #${label.key} 吗？`)) {
                        this.plugin.settings.labels.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.plugin.refreshStyles();
                        this.display();
                        new Notice('标签已删除');
                    }
                }));

        settingDiv.createEl('hr');
    }

    updatePreview(containerEl: HTMLElement, label: LabelConfig): void {
        containerEl.empty();
        containerEl.createEl('strong', { text: '预览: ' });

        const previewSpan = containerEl.createEl('span', {
            cls: 'modevol-preview-label',
            text: `#${label.key} 示例文本`
        });

        previewSpan.style.color = label.color;
        previewSpan.style.border = `1px solid ${label.color}`;
        previewSpan.style.borderRadius = '3px';
        previewSpan.style.padding = '2px 6px';
        previewSpan.style.marginLeft = '8px';
        previewSpan.style.backgroundColor = this.hexToRgba(label.color, 0.1);

        // 显示图标预览
        if (label.svgIcon) {
            const iconDiv = containerEl.createDiv({ cls: 'modevol-preview-icon' });
            iconDiv.innerHTML = label.svgIcon;
            iconDiv.style.marginTop = '8px';
        }
    }

    hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    addNewLabel(): void {
        // 找到一个未使用的字母
        const usedKeys = new Set(this.plugin.settings.labels.map(l => l.key));
        let newKey = '';
        for (let i = 97; i <= 122; i++) { // a-z
            const char = String.fromCharCode(i);
            if (!usedKeys.has(char)) {
                newKey = char;
                break;
            }
        }

        if (!newKey) {
            new Notice('已达到最大标签数量（26个）');
            return;
        }

        const newLabel: LabelConfig = {
            key: newKey,
            name: '新标签',
            color: '#999999',
            svgIcon: `<svg fill="none" version="1.1" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em"><circle cx="24" cy="24" r="12" fill="none" stroke="#999999" stroke-width="3"></circle></svg>`,
            enabled: true
        };

        this.plugin.settings.labels.push(newLabel);
        this.plugin.saveSettings();
        this.plugin.refreshStyles();
        this.display();
        new Notice(`已添加新标签 #${newKey}`);
    }

    exportSettings(): void {
        const dataStr = JSON.stringify(this.plugin.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modevol-settings.json';
        link.click();
        URL.revokeObjectURL(url);
        new Notice('配置已导出');
    }

    importSettings(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const imported = JSON.parse(text);

                // 验证数据格式
                if (!imported.labels || !Array.isArray(imported.labels)) {
                    new Notice('无效的配置文件格式');
                    return;
                }

                // 确认导入
                if (confirm('导入配置将覆盖当前设置，是否继续？')) {
                    this.plugin.settings = imported;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStyles();
                    this.display();
                    new Notice('配置已导入');
                }
            } catch (error) {
                console.error('导入配置失败:', error);
                new Notice('导入配置失败，请检查文件格式');
            }
        };
        input.click();
    }
}
