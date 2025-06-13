import { saveAs } from 'file-saver';
import { supabase } from '../supabase';

export interface KaggleDatasetConfig {
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  licenses: {
    name: string;
    text: string;
  }[];
  resources: {
    path: string;
    description: string;
  }[];
  contributors: {
    name: string;
    role: string;
  }[];
}

export class KaggleExportService {
  /**
   * Export a dataset to Kaggle format
   */
  async exportDataset(
    tableName: string,
    config: KaggleDatasetConfig,
    filters?: any
  ): Promise<void> {
    try {
      console.log(`📦 Exporting ${tableName} for Kaggle...`);
      
      // Fetch data from Supabase
      let query = supabase.from(tableName).select('*');
      
      // Apply filters if provided
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch data: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data available for export');
      }
      
      console.log(`✅ Fetched ${data.length} records for export`);
      
      // Convert to CSV
      const csv = this.convertToCSV(data);
      
      // Create dataset-metadata.json
      const metadata = this.createKaggleMetadata(config);
      
      // Create README.md
      const readme = this.createReadme(config, data);
      
      // Create license file
      const license = this.createLicense(config.licenses[0]);
      
      // Save files
      const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(csvBlob, `${tableName}.csv`);
      
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      saveAs(metadataBlob, 'dataset-metadata.json');
      
      const readmeBlob = new Blob([readme], { type: 'text/markdown' });
      saveAs(readmeBlob, 'README.md');
      
      const licenseBlob = new Blob([license], { type: 'text/plain' });
      saveAs(licenseBlob, 'LICENSE');
      
      console.log('✅ Dataset exported successfully for Kaggle');
    } catch (error) {
      console.error('Error exporting dataset:', error);
      throw error;
    }
  }

  /**
   * Log the export to the database
   */
  async logExport(tableName: string, config: KaggleDatasetConfig): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const { error } = await supabase
        .from('kaggle_exports')
        .insert({
          dataset_name: tableName,
          config: {
            title: config.title,
            subtitle: config.subtitle,
            keywords: config.keywords,
            license: config.licenses[0].name,
            exportedAt: new Date().toISOString()
          },
          record_count: 0, // Will be updated after export
          user_id: userId
        });
      
      if (error) {
        console.error('Error logging export:', error);
      }
    } catch (error) {
      console.error('Error logging export:', error);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    // Get headers
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    const headerRow = headers.join(',');
    
    // Create data rows
    const rows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        
        // Handle different data types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          // For objects (including arrays), stringify and escape quotes
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else if (typeof value === 'string') {
          // Escape quotes in strings
          return `"${value.replace(/"/g, '""')}"`;
        } else {
          // Numbers, booleans, etc.
          return value;
        }
      }).join(',');
    });
    
    // Combine header and rows
    return [headerRow, ...rows].join('\n');
  }

  /**
   * Create Kaggle metadata file
   */
  private createKaggleMetadata(config: KaggleDatasetConfig): any {
    return {
      id: `itsearth/${config.title.toLowerCase().replace(/\s+/g, '-')}`,
      title: config.title,
      subtitle: config.subtitle,
      description: config.description,
      isPrivate: false,
      licenses: config.licenses.map(license => ({
        name: license.name
      })),
      keywords: config.keywords,
      collaborators: config.contributors.map(contributor => ({
        name: contributor.name,
        role: contributor.role
      })),
      resources: config.resources.map(resource => ({
        path: resource.path,
        description: resource.description
      }))
    };
  }

  /**
   * Create README.md file
   */
  private createReadme(config: KaggleDatasetConfig, data: any[]): string {
    // Get column statistics
    const columnStats = this.calculateColumnStats(data);
    
    return `# ${config.title}

## ${config.subtitle}

${config.description}

## Dataset Information

- **Number of Records**: ${data.length}
- **Number of Features**: ${Object.keys(data[0]).length}
- **File Format**: CSV
- **Last Updated**: ${new Date().toISOString().split('T')[0]}

## Features

${Object.entries(columnStats).map(([column, stats]) => {
  return `### ${column}
- **Type**: ${stats.type}
- **Missing Values**: ${stats.missingCount} (${(stats.missingCount / data.length * 100).toFixed(2)}%)
${stats.type === 'numeric' ? `- **Range**: ${stats.min} to ${stats.max}
- **Mean**: ${stats.mean}
- **Standard Deviation**: ${stats.std}` : 
`- **Unique Values**: ${stats.uniqueCount}
- **Most Common**: ${stats.mostCommon} (${stats.mostCommonCount} occurrences)`}
`;
}).join('\n')}

## Use Cases

This dataset can be used for:
- Training machine learning models for ${config.title.toLowerCase()} prediction
- Analyzing patterns in ${config.title.toLowerCase()} data
- Building data visualizations and dashboards
- Research in the field of ${config.keywords.join(', ')}

## License

This dataset is licensed under ${config.licenses[0].name}.

## Citation

If you use this dataset in your research, please cite:

\`\`\`
@dataset{itsearth_${config.title.toLowerCase().replace(/\s+/g, '_')},
  author = {ItsEarth},
  title = {${config.title}},
  year = {${new Date().getFullYear()}},
  publisher = {Kaggle},
  url = {https://www.kaggle.com/datasets/itsearth/${config.title.toLowerCase().replace(/\s+/g, '-')}}
}
\`\`\`

## Acknowledgements

${config.contributors.map(c => `- ${c.name} (${c.role})`).join('\n')}
`;
  }

  /**
   * Create license file
   */
  private createLicense(license: { name: string; text: string }): string {
    return license.text || `This dataset is licensed under the ${license.name} license.

Copyright (c) ${new Date().getFullYear()} ItsEarth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this dataset and associated documentation files, to deal
in the dataset without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the dataset, and to permit persons to whom the dataset is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the dataset.

THE DATASET IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE DATASET OR THE USE OR OTHER DEALINGS IN THE
DATASET.`;
  }

  /**
   * Calculate statistics for each column
   */
  private calculateColumnStats(data: any[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    if (data.length === 0) return stats;
    
    const columns = Object.keys(data[0]);
    
    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      const missingCount = data.length - values.length;
      
      // Check if column is numeric
      const numericValues = values.filter(val => !isNaN(Number(val)));
      
      if (numericValues.length > 0 && numericValues.length >= values.length * 0.5) {
        // Numeric column
        const nums = numericValues.map(v => Number(v));
        const sum = nums.reduce((acc, val) => acc + val, 0);
        const mean = sum / nums.length;
        const squaredDiffs = nums.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / nums.length;
        const std = Math.sqrt(variance);
        
        stats[column] = {
          type: 'numeric',
          min: Math.min(...nums),
          max: Math.max(...nums),
          mean: mean.toFixed(2),
          std: std.toFixed(2),
          missingCount
        };
      } else {
        // Categorical column
        const valueCounts: Record<string, number> = {};
        
        values.forEach(val => {
          const strVal = String(val);
          valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
        });
        
        const uniqueValues = Object.keys(valueCounts);
        let mostCommon = '';
        let mostCommonCount = 0;
        
        Object.entries(valueCounts).forEach(([val, count]) => {
          if (count > mostCommonCount) {
            mostCommon = val;
            mostCommonCount = count;
          }
        });
        
        stats[column] = {
          type: 'categorical',
          uniqueCount: uniqueValues.length,
          mostCommon,
          mostCommonCount,
          missingCount
        };
      }
    });
    
    return stats;
  }
}

export const kaggleExportService = new KaggleExportService();