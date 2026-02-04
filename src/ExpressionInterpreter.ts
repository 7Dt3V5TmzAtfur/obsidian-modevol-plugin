import { Label } from "./Label";
import { LabelConfig } from "./settings";

// modevol 解释器
export default class ExpressionInterpreter {
    static tag_reg = /^#([a-z])(?=\s)(.*|$)/i;
    private labelConfigs: Map<string, LabelConfig>;

    constructor(labelConfigs: LabelConfig[]) {
        this.labelConfigs = new Map();
        labelConfigs.forEach(config => {
            if (config.enabled) {
                this.labelConfigs.set(config.key, config);
            }
        });
    }

    getLabel(regArray: RegExpExecArray): Label | undefined {
        let tag = regArray[1].toLowerCase();

        // 检查是否是自定义标签 (#c)
        if (tag === 'c') {
            return this.customInterpret(regArray);
        }

        // 检查是否是配置中的标签
        const config = this.labelConfigs.get(tag);
        if (config) {
            return this.normalInterpret(regArray, config);
        }

        return undefined;
    }

    private normalInterpret(regArray: RegExpExecArray, config: LabelConfig): Label {
        let label = new Label();
        label.type = config.key;
        label.tagName = config.name;
        label.text = regArray[0];
        label.content = label.text.substring(2);

        let list = label.content.trim().split(' ');
        label.title = list.length > 0 ? list[0] : '';
        label.relation = list.length > 1 ? list[1] : '';

        return label;
    }

    private customInterpret(regArray: RegExpExecArray): Label | undefined {
        let label = new Label();
        label.text = regArray[0];
        label.type = 'c';

        let list = label.text.substring(2).trim().split(/\s+/);
        if (list.length < 0 || list[0].length == 0) return undefined;

        label.tagName = list.length > 0 ? list[0] : "";
        label.title = list.length > 1 ? list[1] : '';
        label.relation = list.length > 2 ? list[2] : '';
        label.content = label.text.substring(3 + label.tagName.length);

        return label;
    }
}
