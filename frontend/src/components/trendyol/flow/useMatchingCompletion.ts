import { useQuery } from '@tanstack/react-query';

import { trendyolApi } from '../../../pages/TrendyolIntegration';



export function useMatchingCompletion() {

  const { data: localCats = [], isLoading: lcLoading } = useQuery({

    queryKey: ['local-categories'],

    queryFn: trendyolApi.getLocalCategories,

  });



  const { data: categoryMapping = {}, isLoading: cmLoading } = useQuery({

    queryKey: ['category-mapping'],

    queryFn: trendyolApi.getCategoryMapping,

  });



  const { data: brandMapping = {} as Record<string, string | number | null>, isLoading: bmLoading } = useQuery({

    queryKey: ['brand-mapping'],

    queryFn: trendyolApi.getBrandMapping,

  });

  const { data: attributeMapping = {}, isLoading: amLoading } = useQuery({

    queryKey: ['attribute-mapping'],

    queryFn: trendyolApi.getAttributeMapping,

  });



  const localList = Array.isArray(localCats) ? localCats : [];

  // At least one category mapped is enough; unmapped categories only skip their products at send time

  const categoriesComplete =

    localList.length === 0 || localList.some(c => Boolean(categoryMapping[c.id]));



  const brandEntries = Object.entries(brandMapping).filter(([, id]) => {

    if (id == null) return false;

    if (typeof id === 'string') return id.trim() !== '';

    return true;

  });

  const brandsComplete = brandEntries.length > 0;



  const attributeComplete = Object.keys(attributeMapping).length > 0;



  const matchingComplete = brandsComplete && attributeComplete;

  const loading = lcLoading || cmLoading || bmLoading || amLoading;



  return {

    loading,

    categoriesComplete,

    brandsComplete,

    attributeComplete,

    matchingComplete,

    localCategoryCount: localList.length,

    mappedCategoryCount: localList.filter(c => Boolean(categoryMapping[c.id])).length,

    brandMappingCount: brandEntries.length,

  };

}

