import * as CodeMirror from 'codemirror';
import { App, debounce, Editor, MarkdownFileInfo, MarkdownPostProcessorContext, MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import { labelField, setLabelConfigs as setStateFieldLabelConfigs } from 'src/StateField';
import { ModevolLabelRender, setLabelConfigs as setWidgetLabelConfigs } from './ModevolWidget';
import { OutlineView, VIEW_TYPE } from './OutlineView';
import { store } from './store';
import { ModevolSettings, DEFAULT_SETTINGS } from './settings';
import { ModevolSettingTab } from './SettingTab';
import { StyleManager } from './StyleManager';
let labelStatusBar: HTMLElement | null = null
export default class ModevolPlugin extends Plugin {
	markdownView: MarkdownView
	settings: ModevolSettings;
	styleManager: StyleManager;

	async onload() {
		// 加载设置
		await this.loadSettings();

		// 初始化样式管理器
		this.styleManager = new StyleManager();
		this.styleManager.injectStyles(this.settings.labels);

		// 初始化标签配置到各个模块
		setStateFieldLabelConfigs(this.settings.labels);
		setWidgetLabelConfigs(this.settings.labels);

		// 添加设置面板
		this.addSettingTab(new ModevolSettingTab(this.app, this));

		this.initStore()
		this.registerV()
		this.registerListenter()
		this.registerExt()
		this.registerCommend()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	refreshStyles() {
		this.styleManager.injectStyles(this.settings.labels);
		// 更新标签配置到各个模块
		setStateFieldLabelConfigs(this.settings.labels);
		setWidgetLabelConfigs(this.settings.labels);
	}

	onunload() {
		// 清理样式
		this.styleManager.removeStyles();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
	}
	initStore() {
		store.darkTheme = document.body.hasClass("theme-dark");
		store.labels = []
		store.headings = []
	}
	registerV() {
		const item = this.addStatusBarItem()
		labelStatusBar = item.createSpan({ text: 'Modevol' });

		this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => new OutlineView(leaf, this))
	}
	registerListenter() {
		this.registerEvent(this.app.workspace.on('editor-change', debounce(this.editorChange, 300)))
		this.registerEvent(this.app.metadataCache.on('changed', () => {
			this.refreshHeader()
		}))
		this.registerEvent(this.app.workspace.on('layout-change', () => {
			// console.log('layout-change')
			this._refreshHeader()
		}))

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			// console.log('active-leaf-change')

			this._refreshHeader()

			let view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				// 保证第一次获取标题信息时，也能正常展开到默认层级
				if (!this.markdownView) {
					this.markdownView = view;
					return;
				}
				if (view == this.markdownView) {
					return
				}
				this.markdownView = view;
			}
		}))
		this.registerEvent(this.app.workspace.on("css-change", () => {
			store.darkTheme = document.body.hasClass("theme-dark");
		}));
	}
	registerExt() {
		this.registerEditorExtension([labelField])
		this.registerMarkdownPostProcessor(MarkdownPostProcessor)
	}
	registerCommend() {
		this.addCommand({
			id: "modevol-outline",
			name: "Modevol Outline",
			callback: () => {
				this.activateView();
			}
		});

	}
	editorChange(editor: Editor, info: MarkdownView | MarkdownFileInfo) {
		// 使用 Map 动态统计标签
		const labelCounts = new Map<string, number>();

		// 初始化所有启用的标签计数
		this.settings.labels.forEach(labelConfig => {
			if (labelConfig.enabled) {
				labelCounts.set(labelConfig.key, 0);
			}
		});

		// 统计标签
		for (const label of store.labels) {
			if (labelCounts.has(label.type)) {
				labelCounts.set(label.type, labelCounts.get(label.type)! + 1);
			}
		}

		// 生成显示内容
		let content = "";
		this.settings.labels.forEach(labelConfig => {
			if (!labelConfig.enabled) return;
			const count = labelCounts.get(labelConfig.key) || 0;
			if (count > 0) {
				content += ` ${labelConfig.name} ${count}`;
			}
		});

		if (labelStatusBar) {
			labelStatusBar.textContent = content || 'Modevol';
		}
	}
	async activateView() {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0) {
			await this.app.workspace.getRightLeaf(false).setViewState({
				type: VIEW_TYPE,
				active: true,
			});
		}
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]
		);
	}
	refreshHeader = debounce(this._refreshHeader, 300)
	_refreshHeader() {
		const file = this.app.workspace.getActiveFile()
		if (!file) return
		const cache = this.app.metadataCache.getFileCache(file)
		if (!cache) return
		store.fileName = file.basename
		const headers = cache.headings
		store.headings = headers ? headers : []
	}
}

function MarkdownPostProcessor(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<any> | void {
	const tags = element.querySelectorAll('.tag')
	for (let index = 0; index < tags.length; index++) {
		const tag = tags.item(index)
		let pr = tag.previousSibling
		let nextNode = tag.nextSibling
		if (pr && !pr.nodeValue?.endsWith('\n')) {
			continue
		}
		if (!nextNode) return

		// 检查是否是标签格式 (#x)
		const tagText = tag.textContent;
		if (tagText && /^#[a-z]$/i.test(tagText)) {
			let render = new ModevolLabelRender(tag as HTMLElement, nextNode, tag.nextElementSibling)
			context.addChild(render)
		}
	}
}

