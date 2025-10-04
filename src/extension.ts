import * as vscode from 'vscode';
import { activate as refWindowActivate } from './reference-window';
import { test as symbolInfoTest } from './symbol-info';


/**
 *  This method is called when the extension is activated. The extension is
 *  activated the very first time a command is executed.
 */
export async function activate(context: vscode.ExtensionContext) {
  
  const outputChannel = vscode.window.createOutputChannel('clangd');
  context.subscriptions.push(outputChannel);

  // 注册 reference-window 相关命令
  refWindowActivate(context);

  // 注册 symbol-info 中的 ci.test 命令
  symbolInfoTest(context);

}
