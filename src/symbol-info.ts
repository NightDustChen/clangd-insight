import * as vscode from 'vscode'
import * as vscodelc from 'vscode-languageclient'
import { SearchFuncByCTag } from './ctags';

export enum SymbolKindCI {
    function = 0,
    macro = 1,
    variable = 2,
    param = 3,
    field = 4,
    type_alias = 5,
    struct = 6,
    enum = 7,
    enumerator = 8,
    union = 9,
    file = 10,
    unknown = 11
}

export async function GetSymbolKindCI(uri: vscode.Uri, position: vscode.Position): Promise<SymbolKindCI> {
    let symbolHover = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        uri,
        position
    );
    let symbolHoverStr = symbolHover[0].contents[0];
    if (symbolHoverStr instanceof vscode.MarkdownString) {
        let symbolTypeStr: string = symbolHoverStr.value.split(" ")[1];
        switch (symbolTypeStr) {
            case 'type-alias':
                return SymbolKindCI.type_alias;
            case 'function':
                return SymbolKindCI.function;
            case 'macro':
                return SymbolKindCI.macro;
            case 'variable':
                return SymbolKindCI.variable;
            case 'param':
                return SymbolKindCI.param;
            case 'field':
                return SymbolKindCI.field;
            case 'struct':
                return SymbolKindCI.struct;
            case 'enum':
                return SymbolKindCI.enum;
            case 'enumerator':
                return SymbolKindCI.enumerator;
            case 'union':
                return SymbolKindCI.union;
            case 'file':
                return SymbolKindCI.file;
            default:
                return SymbolKindCI.unknown;
        }
    }
    return SymbolKindCI.unknown;
}

export async function test(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('ci.test', async () => {
        try {
            console.time('Test');
            let textDocument = vscode.window.activeTextEditor?.document;
            let position = vscode.window.activeTextEditor?.selection.active;
            if (textDocument && position) {
                let ref = await vscode.commands.executeCommand<(vscode.Location & { containerName: string })[]>('vscode.executeReferenceProvider',
                    textDocument.uri,
                    position);
                let rst = await SearchFuncByCTag(ref);
                console.log(rst);
            }
            console.timeEnd('Test');
        } catch (e) {
            console.log(e);
        }
    })
}