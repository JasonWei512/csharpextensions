import CsprojReader from './csprojReader';
import { Uri, workspace } from 'vscode';
import * as path from 'path';
import * as findupglob from 'find-up-glob';

export class FileScopedNamespaceModifier {
    /**
     * 
     * @param doc The content of the template file
     * @param filePath The path of the file that is being created
     * @returns 
     */

    public async applyFileScopedNamespace(doc: string, filePath: string): Promise<string> {
        if (!filePath.endsWith('.cs')) {
            return doc;
        }

        const csprojs: string[] = await findupglob('*.csproj', { cwd: path.dirname(filePath) });

        if (csprojs === null || csprojs.length < 1) {
            return doc;
        }

        const csprojFile = csprojs[0];
        const fileContent = await this.read(Uri.file(csprojFile));
        const projectReader = new CsprojReader(fileContent);
        const targetFramework = await projectReader.getTargetFramework();

        if (targetFramework === undefined) {
            return doc;
        }

        const versionRegex = /(?<=net)\d(\.\d)*/;
        const versionString = targetFramework.match(versionRegex);

        if (versionString === null) {
            return doc;
        }

        const version = +versionString[0];

        if (version >= 6.0 && workspace.getConfiguration().get('csharpextensions.useFileScopedNamespace', true)) {
            return this.doApplyFileScopedNamespace(doc);
        }

        return doc;
    }

    private doApplyFileScopedNamespace(doc: string): string {
        const namespaceRegex = new RegExp(/(?<=\${namespace})/);
        const namespaceClauseRegex = new RegExp(/(?<=^)({|}| {4})/, 'gm');
           
        const result = doc
            .replace(namespaceClauseRegex, '')
            .replace(namespaceRegex, ';');

        return result;
    }

    private async read(file: Uri): Promise<string> {
        const document = await workspace.openTextDocument(file);

        return document.getText();
    }
}

export default new FileScopedNamespaceModifier();