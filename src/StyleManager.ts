import { LabelConfig } from './settings';

export class StyleManager {
    private styleEl: HTMLStyleElement | null = null;

    constructor() {
        this.styleEl = null;
    }

    generateStyles(labels: LabelConfig[]): string {
        let css = ':root {\n';

        // 为每个标签生成 CSS 变量
        labels.forEach(label => {
            if (!label.enabled) return;

            const key = label.key;
            const color = label.color;
            const rgba = this.hexToRgba(color, 0.3);

            css += `    --modevol-${key}-color: ${color};\n`;
            css += `    --modevol-${key}-background-color: ${rgba};\n`;
        });

        css += '}\n\n';

        // 为每个标签生成样式类
        labels.forEach(label => {
            if (!label.enabled) return;

            const key = label.key;

            // 编辑模式样式
            css += `.mv-label-${key} {\n`;
            css += `    color: var(--modevol-${key}-color);\n`;
            css += `    background-color: var(--modevol-${key}-background-color);\n`;
            css += `    border-color: var(--modevol-${key}-color);\n`;
            css += '}\n\n';

            // 阅读模式样式
            css += `.mv-pre-label.mv-${key} {\n`;
            css += `    color: var(--modevol-${key}-color);\n`;
            css += '}\n\n';
        });

        return css;
    }

    injectStyles(labels: LabelConfig[]): void {
        // 移除旧样式
        this.removeStyles();

        // 生成新样式
        const css = this.generateStyles(labels);

        // 创建并插入新样式
        this.styleEl = document.createElement('style');
        this.styleEl.id = 'modevol-dynamic-styles';
        this.styleEl.textContent = css;
        document.head.appendChild(this.styleEl);
    }

    removeStyles(): void {
        if (this.styleEl && this.styleEl.parentNode) {
            this.styleEl.parentNode.removeChild(this.styleEl);
            this.styleEl = null;
        }

        // 也尝试通过 ID 移除（防止遗留）
        const existingStyle = document.getElementById('modevol-dynamic-styles');
        if (existingStyle && existingStyle.parentNode) {
            existingStyle.parentNode.removeChild(existingStyle);
        }
    }

    private hexToRgba(hex: string, alpha: number): string {
        // 移除 # 号
        hex = hex.replace('#', '');

        // 处理短格式 (#RGB)
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
