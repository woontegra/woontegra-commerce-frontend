import type { VariantGroup, VariantOption, VariantCombination } from '../types/variant';

class VariantGeneratorService {
  // Generate all possible combinations
  generateCombinations(
    groups: VariantGroup[],
    selectedOptions: Record<string, VariantOption[]>,
    basePrice: number,
    baseSku: string
  ): VariantCombination[] {
    // Get all selected options grouped by group
    const optionsByGroup: Array<{ groupName: string; options: VariantOption[] }> = [];
    
    groups.forEach(group => {
      const options = selectedOptions[group.id] || [];
      if (options.length > 0) {
        optionsByGroup.push({
          groupName: group.name,
          options,
        });
      }
    });

    if (optionsByGroup.length === 0) {
      return [];
    }

    // Generate cartesian product
    const combinations = this.cartesianProduct(optionsByGroup);
    
    // Convert to VariantCombination format
    return combinations.map((combo) => {
      const options: Record<string, string> = {};
      const skuParts: string[] = [baseSku];
      
      combo.forEach(({ groupName, option }) => {
        options[groupName] = option.value;
        skuParts.push(this.slugify(option.value));
      });

      return {
        options,
        sku: skuParts.join('-'),
        price: basePrice,
        stock: 0,
      };
    });
  }

  // Cartesian product of arrays
  private cartesianProduct(
    arrays: Array<{ groupName: string; options: VariantOption[] }>
  ): Array<Array<{ groupName: string; option: VariantOption }>> {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) {
      return arrays[0].options.map(opt => [{
        groupName: arrays[0].groupName,
        option: opt,
      }]);
    }

    const result: Array<Array<{ groupName: string; option: VariantOption }>> = [];
    const [first, ...rest] = arrays;
    const restProduct = this.cartesianProduct(rest);

    first.options.forEach(option => {
      restProduct.forEach(combo => {
        result.push([
          { groupName: first.groupName, option },
          ...combo,
        ]);
      });
    });

    return result;
  }

  // Slugify for SKU generation
  private slugify(text: string): string {
    const turkishMap: Record<string, string> = {
      'ç': 'c', 'Ç': 'C',
      'ğ': 'g', 'Ğ': 'G',
      'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O',
      'ş': 's', 'Ş': 'S',
      'ü': 'u', 'Ü': 'U',
    };

    return text
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Validate variant configuration
  validateConfiguration(
    groups: VariantGroup[],
    selectedOptions: Record<string, VariantOption[]>
  ): { valid: boolean; error?: string } {
    if (groups.length === 0) {
      return { valid: false, error: 'En az bir varyant grubu seçmelisiniz' };
    }

    for (const group of groups) {
      const options = selectedOptions[group.id] || [];
      if (options.length === 0) {
        return { valid: false, error: `${group.name} için en az bir seçenek eklemelisiniz` };
      }
    }

    return { valid: true };
  }

  // Calculate total combinations count
  calculateCombinationCount(selectedOptions: Record<string, VariantOption[]>): number {
    const counts = Object.values(selectedOptions).map(opts => opts.length);
    return counts.reduce((acc, count) => acc * count, 1);
  }
}

export const variantGeneratorService = new VariantGeneratorService();
