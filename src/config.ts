import * as vscode from 'vscode';

export function getConfig<T>(key: string): T | undefined {
    const config = vscode.workspace.getConfiguration('ci');
    return config.get<T>(key);
}
