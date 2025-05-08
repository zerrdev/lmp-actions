import * as fs from 'fs-extra';
import * as path from 'path';
import { createInterface } from 'readline';
import { createReadStream } from 'fs';
const { Readable } = require('stream');

export class LmpOperator {
  /**
   * Extract files from an LMP format file to a destination directory
   * @param lmpFilePath Path to the .lmp file
   * @param destDir Destination directory to extract files to
   * @returns Promise that resolves to the number of files extracted
   */
  async extract(from: {filePath?: string, content?: string}, destDir: string): Promise<number> {
    if (from.filePath) {
      // Check if the input file exists
      if (!await fs.pathExists(from.filePath)) {
        throw new Error(`Input file does not exist: ${from.filePath}`);
      }
    }
    
    // Ensure destination directory exists
    await fs.ensureDir(destDir);
    let fileStream;
    if (from.filePath) {
      fileStream = createReadStream(from.filePath, { encoding: 'utf8' });
    } else {
      fileStream = Readable.from(from.content);
    }
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let isReadingFile = false;
    let currentFilePath = '';
    let currentFileContent = '';
    let extractedFileCount = 0;
    
    // Parse the file line by line
    for await (const line of rl) {
      // File start marker
      if (!isReadingFile && line.match(/^\[FILE_START: .+\]$/)) {        
        isReadingFile = true;
        currentFilePath = line.replace(/^\[FILE_START: (.+)\]$/, '$1').trim();
        currentFileContent = '';
        continue;
      }
      
      // File end marker
      if (isReadingFile && line.match(/^\[FILE_END: .+\]$/)) {        
        const foundFilePath = line.replace(/^\[FILE_END: (.+)\]$/, '$1').trim();
        if (currentFilePath == foundFilePath) {
          const fullPath = path.join(destDir, currentFilePath);
          await this.writeFile(fullPath, currentFileContent);
          
          isReadingFile = false;
          extractedFileCount++;
          continue; 
        }
      }
      
      // File content
      if (isReadingFile) {
        currentFileContent += line + '\n';
      }
    }
    
    // Check if we have an unclosed file declaration
    if (isReadingFile) {
      throw new Error(`Unclosed file declaration: ${currentFilePath}`);
    }
    
    return extractedFileCount;
  }
  
  /**
   * Writes a file, ensuring the directory exists
   * @param filePath Path where to write the file
   * @param content Content to write
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    await fs.writeFile(filePath, content);
    console.log(`Created: ${filePath}`);
  }

  /**
   * Creates an LMP format representation of a folder and its contents
   * @param folderPath Path to the folder to process
   * @param options Configuration options
   * @returns Promise that resolves to the LMP format string
   */
  async copyFolderAsLmp(folderPath: string, options: {
    excludeExtensions?: string[],
    excludePatterns?: RegExp[],
    relativeTo?: string
  } = {}): Promise<string> {    
    // Default options
    const opts = {
      excludeExtensions: options.excludeExtensions || [],
      excludePatterns: options.excludePatterns || [],
      relativeTo: options.relativeTo || folderPath
    };

    // Check if the folder exists
    if (!await fs.pathExists(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    // Get all files recursively
    const files = await this.getAllFiles(folderPath, opts);
    
    // Generate LMP content
    let lmpContent = '';
    
    for (const file of files) {
      try {
        // Read file content
        const content = await fs.readFile(file, 'utf8');
        
        // Get relative path for the file
        const relativePath = path.relative(opts.relativeTo, file).replace(/\\/g, '/');
        
        // Add file to LMP content
        lmpContent += `[FILE_START: ${relativePath}]\n`;
        lmpContent += content;
        if (!content.endsWith('\n')) {
          lmpContent += '\n';
        }
        lmpContent += `[FILE_END: ${relativePath}]\n\n`;
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    return lmpContent;
  }

  /**
   * Gets all files in a directory recursively
   * @param dir Directory to scan
   * @param options Filtering options
   * @returns Promise that resolves to an array of file paths
   */
  private async getAllFiles(dir: string, options: {
    excludeExtensions: string[],
    excludePatterns: RegExp[],
    relativeTo: string
  }): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    const files = await Promise.all(entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      
      // Skip files with excluded extensions
      const ext = path.extname(entry.name).toLowerCase();
      if (options.excludeExtensions.includes(ext)) {
        return [];
      }
      
      // Skip files matching excluded patterns
      const relativePath = path.relative(options.relativeTo, res).replace(/\\/g, '/');
      if (options.excludePatterns.some(pattern => pattern.test(relativePath))) {
        return [];
      }
      
      return entry.isDirectory() ? this.getAllFiles(res, options) : [res];
    }));
    
    return files.flat();
  }
}