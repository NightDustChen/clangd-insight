import * as vscode from 'vscode'
import { GetSymbolKindCI, SymbolKindCI } from './symbol-info';
import * as assert from 'assert'
import { SearchFuncByCTag } from './ctags';
import * as path from 'path'

export interface SymbolReference {
    symName: string;        // 符号名称
    symUri: string;    // 符号类型（function, variable, etc.）
    symRange: vscode.Range;
    symType: SymbolKindCI;
    locations: vscode.Range[];     // 该符号的所有引用位置
}

async function JumpToFile(uri: string, range: vscode.Range) {
    try {

        const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
        const editor = await vscode.window.showTextDocument(document, {
            selection: range, // 直接选中指定范围
        });

        // 确保光标选中该范围
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // 居中显示选中范围
    } catch (error) {
        vscode.window.showErrorMessage(`无法跳转到指定位置: ${error}`);
    }
}

async function GetFunctionRange(sym: SymbolReference): Promise<boolean> {

    let symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        vscode.Uri.parse(sym.symUri)
    );
    // To find only macro header
    const findFunction = (symbols: vscode.DocumentSymbol[]): boolean => {
        assert.notEqual(symbols, undefined, "Get document symbol undefined");
        let find: boolean = false;
        for (const symbol of symbols) {
            if ((symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) && symbol.name === sym.symName) {
                find = true;
            } else {
                let childResult = findFunction(symbol.children);
                if (childResult) { return childResult; }
            }
            if (find) {
                sym.symRange = symbol.selectionRange;
                return true;
            }
        }
        return false;
    };
    return findFunction(symbols);
}

class ReferenceTreeViewItem extends vscode.TreeItem {
    constructor(root: boolean = false, symRef: SymbolReference, provider: ReferenceTreeViewProvider) {
        super(symRef.symName, vscode.TreeItemCollapsibleState.Collapsed);
        this.symRef = symRef;
        this.provider = provider;
        switch (this.symRef.symType) {
            case SymbolKindCI.function:
                this.iconPath = new vscode.ThemeIcon('symbol-function');
                break;
            case SymbolKindCI.struct:
            case SymbolKindCI.union:
                this.iconPath = new vscode.ThemeIcon('symbol-struct');
                break;
            case SymbolKindCI.param:
            case SymbolKindCI.variable:
            case SymbolKindCI.type_alias:
                this.iconPath = new vscode.ThemeIcon('symbol-variable');
                break;
            case SymbolKindCI.file:
                this.iconPath = new vscode.ThemeIcon('symbol-file');
                this.collapsibleState = vscode.TreeItemCollapsibleState.None;
                break;
            case SymbolKindCI.macro:
                this.iconPath = new vscode.ThemeIcon('symbol-constant');
                break;
            case SymbolKindCI.field:
                this.iconPath = new vscode.ThemeIcon('symbol-field');
                break;
            case SymbolKindCI.enum:
                this.iconPath = new vscode.ThemeIcon('symbol-enum');
                break;
            case SymbolKindCI.enumerator:
                this.iconPath = new vscode.ThemeIcon('symbol-enum-member');
                break;
            default:
                break;
        }
        if (!root) {
            this.description = `${this.nowLoction + 1}/${this.symRef?.locations.length}`;
            this.contextValue = "child";
            this.command = {
                command: "ci.jump",
                title: "Jump to it!",
                arguments: [this.symRef.symUri, this.symRef.locations[this.nowLoction]]
            };
        } else {
            this.command = {
                command: "ci.jump",
                title: "Jump to it!",
                arguments: [this.symRef.symUri, this.symRef.symRange]
            };
        }
    }

    symRef: SymbolReference;
    nowLoction: number = 0;
    provider: ReferenceTreeViewProvider;

    jumpNext() {
        assert.notEqual(this.symRef, undefined, 'Undefined Symbol Reference Object');
        if (this.nowLoction < (this.symRef.locations.length - 1)) {
            this.nowLoction += 1;
        }
        this.description = `${this.nowLoction + 1}/${this.symRef?.locations.length}`;
        vscode.commands.executeCommand("ci.jump", this.symRef.symUri, this.symRef.locations[this.nowLoction]);
    }

    jumpPrev() {
        assert.notEqual(this.symRef, undefined, 'Undefined Symbol Reference Object');
        if (this.nowLoction !== 0) {
            this.nowLoction -= 1;
        }
        this.description = `${this.nowLoction + 1}/${this.symRef?.locations.length}`;
        vscode.commands.executeCommand("ci.jump", this.symRef.symUri, this.symRef.locations[this.nowLoction]);
    }
}

class ReferenceTreeViewProvider implements vscode.TreeDataProvider<ReferenceTreeViewItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReferenceTreeViewItem | undefined | void> = new vscode.EventEmitter<ReferenceTreeViewItem | undefined | void>();
    readonly onDidChangeTreeData?: vscode.Event<void | ReferenceTreeViewItem | null | undefined> | undefined = this._onDidChangeTreeData.event;

    getTreeItem(element: ReferenceTreeViewItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: ReferenceTreeViewItem | undefined): Promise<ReferenceTreeViewItem[] | undefined> {
        // root item
        if (!element) {
            try {
                let activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) throw new Error('No active Editor');
                let uri = activeEditor.document.uri;
                let position = activeEditor.selection.active;
                let symbolRange = activeEditor.document.getWordRangeAtPosition(position);
                if (!symbolRange) throw new Error('Range Error');
                let symbolName = activeEditor.document.getText(symbolRange);
                let type = await GetSymbolKindCI(uri, position);
                let sym: SymbolReference = {
                    symName: symbolName,
                    symUri: uri.toString(),
                    symRange: symbolRange,
                    symType: type,
                    locations: []
                };
                return [new ReferenceTreeViewItem(true, sym, this)];

            } catch (e) {
                return undefined;
            }
        } else {
            let symRef = element.symRef;
            assert.notEqual(symRef, undefined, "Error on refresh reference");
            if (symRef.symRange.start.isEqual(symRef.symRange.end)) {
                let result = await GetFunctionRange(symRef);
                if (!result) {
                    vscode.window.showErrorMessage(`Clangd: Error on find function ${symRef.symName}`);
                    return undefined;
                }
            }
            let refs = await vscode.commands.executeCommand<(vscode.Location & { containerName: string })[]>('vscode.executeReferenceProvider',
                vscode.Uri.parse(symRef.symUri), symRef.symRange.start);
            return (await SearchFuncByCTag(refs)).map((val) => new ReferenceTreeViewItem(false, val, this));
        }
    }

    refersh() {
        this._onDidChangeTreeData.fire();
    }

    refreshItem(item: ReferenceTreeViewItem) {
        this._onDidChangeTreeData.fire(item);
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('ci.jump', JumpToFile),
        vscode.commands.registerCommand('ci.ref-view.jumpPrev', (item: ReferenceTreeViewItem) => {
            item.jumpPrev();
            item.provider.refreshItem(item);
        }),
        vscode.commands.registerCommand('ci.ref-view.jumpNext', (item: ReferenceTreeViewItem) => {
            item.jumpNext();
            item.provider.refreshItem(item);
        })
    );



    let TreeProviders: ReferenceTreeViewProvider[] = [];
    for (let idx = 1; idx < 5; idx++) {
        let provider = new ReferenceTreeViewProvider();
        TreeProviders.push(provider);
        context.subscriptions.push(
            vscode.window.createTreeView(`ci.ref-view-${idx}`, { treeDataProvider: provider }),
            vscode.commands.registerCommand(`ci.ref-view-${idx}.refresh`, () => {
                provider.refersh();
            })
        );
    }
}