import * as proc from 'child_process'
import * as vscode from 'vscode'
import { SymbolReference } from './reference-window';
import * as path from 'path'
import { SymbolKindCI } from './symbol-info';
import { getConfig } from './config';

interface CTagFuncListItem {
    func_name: string;
    func_start: number;
    func_end: number;
}

class CTagFuncList {
    private cache_list: Map<string, CTagFuncListItem[]> = new Map();

    constructor() { 
        this.cache_list = new Map();
    };

    async append(cTagStrs: string[]) {
        for (let tagStr of cTagStrs) {
            if (tagStr === '') continue;
            let tags: string[] = tagStr.split('\t');
            let funcItem: CTagFuncListItem = {
                func_name: tags[0],
                func_start: parseInt(tags[4].slice(5)),
                func_end: parseInt(tags[5].slice(4))
            }
            let uri: string = path.basename(tags[1]);
            if (!this.cache_list.has(uri)) {
                this.cache_list.set(uri, []);
            }
            this.cache_list.get(uri)?.push(funcItem);
        }
        return this;
    }

    async find(location: vscode.Location, callback: (a: vscode.Location, b: CTagFuncListItem) => boolean): Promise<undefined | null | CTagFuncListItem> {
        let basename = path.basename(location.uri.path);
        if (this.cache_list.has(basename)) {
            let funcmaps = this.cache_list.get(basename);
            for (let func of funcmaps as CTagFuncListItem[]) {
                if (callback(location, func)) {
                    return func;
                }
            }
        }
        return null;
    }
}

export async function SearchFuncByCTag(loactions: vscode.Location[]) {
    let ctag_path: string | undefined = getConfig<string>('ctagPath');
    if (!ctag_path) {
        throw new Error('No find ctags path');
    }
    let uriSet = new Set<string>(loactions.map((val) => val.uri.fsPath));
    let parse_args = ['-n', '--c-kinds=f', '--fields=+ne-tf', '-o', '-'];
    let parse_arg = [...parse_args, ...uriSet.values()];
    let rst = proc.execFileSync(ctag_path, parse_arg).toString();
    let rstline = rst.split('\r\n');
    let funclists = await (new CTagFuncList()).append(rstline);

    let symInfos = new Map<string, SymbolReference>();
    console.log('location length:', loactions.length);
    for (let val of loactions) {
        let funcItem = await funclists.find(val, (a: vscode.Location, b: CTagFuncListItem) => {
            return (a.range.start.line + 1) >= b.func_start && (a.range.end.line + 1) <= b.func_end;
        })
        if (funcItem === undefined) {
            return [];
        } else if (funcItem === null) {
            let filename = path.basename(val.uri.toString());
            if (!symInfos.has(filename)) {
                symInfos.set(filename, {
                    symName: filename,
                    symUri: val.uri.toString(),
                    symRange: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
                    symType: SymbolKindCI.file,
                    locations: [val.range]
                });
            } else {
                symInfos.get(filename)?.locations.push(val.range);
            }
        } else {
            if (!symInfos.has(funcItem.func_name)) {
                symInfos.set(funcItem.func_name, {
                    symName: funcItem.func_name,
                    symUri: val.uri.toString(),
                    symRange: new vscode.Range(new vscode.Position(funcItem.func_start, 0), new vscode.Position(funcItem.func_start, 0)),
                    symType: SymbolKindCI.function,
                    locations: [val.range]
                })
            } else {
                symInfos.get(funcItem.func_name)?.locations.push(val.range);
            }
        }
    }
    // For test return symInfos value ok?
    for (let element of symInfos.values()) {
        console.log(element.symName, element.locations.length);
    }
    return [...symInfos.values()];
}