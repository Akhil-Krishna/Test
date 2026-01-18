You're absolutely right! Let me give you a clean, organized list of all the changes needed.

## Summary of Required Changes

### 1. **DTO File** - Add new fields
**File**: `dtos/product-input.dto.ts`

**Action**: Add these two new fields to your DTO class:

```typescript
@ApiPropertyOptional()
relatedExistingUrlsMap?: string; // JSON stringified object

@ApiPropertyOptional()
localExistingUrlsMap?: string; // JSON stringified object
```

---

### 2. **Frontend Component** - Update form submission
**File**: `component.jsx`

**Action**: In the `onSubmit` function of `productForm`, **REPLACE** the section that handles related/local products (around line 500-600, where you have the comment `// NEW: Append multiple related products`)

**Replace this entire section:**
```javascript
// NEW: Append multiple related and local products
if (relatedProducts.length > 0) {
  const relatedProductIds = relatedProducts.map(p => p.productId?.value).filter(Boolean);
  payload.append("relatedProductIds", JSON.stringify(relatedProductIds));
  
  relatedProducts.forEach((relatedProduct, index) => {
      if (relatedProduct.images && relatedProduct.images.length > 0) {
      relatedProduct.images.forEach((img: any) => {
          if (img instanceof File) {
          payload.append(`relatedImages_${index}`, img);
          }
      });
      }
  });
}

if (localProducts.length > 0) {
  const localProductIds = localProducts.map(p => p.productId?.value).filter(Boolean);
  payload.append("localProductIds", JSON.stringify(localProductIds));
  
  localProducts.forEach((localProduct, index) => {
      if (localProduct.images && localProduct.images.length > 0) {
      localProduct.images.forEach((img: any) => {
          if (img instanceof File) {
          payload.append(`localImages_${index}`, img);
          }
      });
      }
  });
}
```

**With this new code:**
```javascript
// NEW: Append multiple related products
if (relatedProducts.length > 0) {
  const relatedProductIds = relatedProducts.map(p => p.productId?.value).filter(Boolean);
  payload.append("relatedProductIds", JSON.stringify(relatedProductIds));
  
  const relatedExistingUrlsMap: Record<number, string[]> = {};
  
  relatedProducts.forEach((relatedProduct, index) => {
    const existingUrls: string[] = [];
    const newFiles: File[] = [];
    
    if (relatedProduct.images && relatedProduct.images.length > 0) {
      relatedProduct.images.forEach((img: any) => {
        if (typeof img === 'string') {
          existingUrls.push(img);
        } else if (img instanceof File) {
          newFiles.push(img);
        }
      });
    }
    
    // Store existing URLs in map
    if (existingUrls.length > 0) {
      relatedExistingUrlsMap[index] = existingUrls;
    }
    
    // Append new files
    newFiles.forEach((file) => {
      payload.append(`relatedImages_${index}`, file);
    });
  });
  
  // Send the entire existing URLs map as one JSON field
  if (Object.keys(relatedExistingUrlsMap).length > 0) {
    payload.append("relatedExistingUrlsMap", JSON.stringify(relatedExistingUrlsMap));
  }
}

// NEW: Append multiple local products
if (localProducts.length > 0) {
  const localProductIds = localProducts.map(p => p.productId?.value).filter(Boolean);
  payload.append("localProductIds", JSON.stringify(localProductIds));
  
  const localExistingUrlsMap: Record<number, string[]> = {};
  
  localProducts.forEach((localProduct, index) => {
    const existingUrls: string[] = [];
    const newFiles: File[] = [];
    
    if (localProduct.images && localProduct.images.length > 0) {
      localProduct.images.forEach((img: any) => {
        if (typeof img === 'string') {
          existingUrls.push(img);
        } else if (img instanceof File) {
          newFiles.push(img);
        }
      });
    }
    
    // Store existing URLs in map
    if (existingUrls.length > 0) {
      localExistingUrlsMap[index] = existingUrls;
    }
    
    // Append new files
    newFiles.forEach((file) => {
      payload.append(`localImages_${index}`, file);
    });
  });
  
  // Send the entire existing URLs map as one JSON field
  if (Object.keys(localExistingUrlsMap).length > 0) {
    payload.append("localExistingUrlsMap", JSON.stringify(localExistingUrlsMap));
  }
}
```

---

### 3. **Backend Service** - Update helper method signature
**File**: `product.service.ts`

**Action A**: Find the `handleMultipleRelatedProductsWithMerge` method (around line 90-120)

**REPLACE the entire method** with:
```typescript
/**
 * Handle multiple related/local products with their images - Use existing URLs from DTO
 */
private async handleMultipleRelatedProductsWithMerge(
  productId: bigint,
  productCodes: string[],
  fileMap: Record<string, Express.Multer.File[]>,
  productType: 'Related' | 'Local',
  existingImagesMap: Map<string, string[]>,
  existingUrlsMapFromDto: Record<number, string[]>,
): Promise<void> {
  const prefix = productType === 'Related' ? 'relatedImages' : 'localImages';

  for (let index = 0; index < productCodes.length; index++) {
    const code = productCodes[index];
    
    // Find the related/local product by code
    const relatedProduct = await this.productModel.findOne({
      where: { temporaryCode: code },
      attributes: ['id'],
    });

    if (!relatedProduct) {
      console.warn(`${productType} product with code ${code} not found`);
      continue;
    }

    // Get existing URLs from DTO (these are the ones user kept after deletions)
    const existingUrlsFromFrontend = existingUrlsMapFromDto[index] || [];

    // Get NEW image files for this specific product
    const imageFieldName = `${prefix}_${index}`;
    const imageFiles = fileMap[imageFieldName] || [];

    // Upload NEW images
    const newUploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const url = await this.documentService.uploadDo(file);
      newUploadedUrls.push(url);
    }

    // Combine ONLY frontend's existing URLs + new uploads
    const finalImages = [...existingUrlsFromFrontend, ...newUploadedUrls];

    // Create entry in RelatedLocalImages table
    if (finalImages.length > 0) {
      await this.relatedLocalImageModel.create({
        productId: productId,
        relatedLocalProductId: relatedProduct.id,
        productType: productType,
        image: finalImages,
      });
    }
  }
}
```

**Action B**: In the same file, find the `updateProduct` method, locate these two sections (around line 550-580):

**Find this:**
```typescript
// Handle multiple related products with preserved images
const relatedProductIds = this.parseJsonField(updateProductDto.relatedProductIds);
if (relatedProductIds && relatedProductIds.length > 0) {
  await this.handleMultipleRelatedProductsWithMerge(
    BigInt(id),
    relatedProductIds,
    fileMap,
    'Related',
    existingImagesMap,
  );
}

// Handle multiple local products with preserved images
const localProductIds = this.parseJsonField(updateProductDto.localProductIds);
if (localProductIds && localProductIds.length > 0) {
  await this.handleMultipleRelatedProductsWithMerge(
    BigInt(id),
    localProductIds,
    fileMap,
    'Local',
    existingImagesMap,
  );
}
```

**REPLACE with:**
```typescript
// Handle multiple related products with preserved images
const relatedProductIds = this.parseJsonField(updateProductDto.relatedProductIds);
if (relatedProductIds && relatedProductIds.length > 0) {
  const relatedExistingUrlsMap = this.parseJsonField(updateProductDto.relatedExistingUrlsMap) || {};
  
  await this.handleMultipleRelatedProductsWithMerge(
    BigInt(id),
    relatedProductIds,
    fileMap,
    'Related',
    existingImagesMap,
    relatedExistingUrlsMap,
  );
}

// Handle multiple local products with preserved images
const localProductIds = this.parseJsonField(updateProductDto.localProductIds);
if (localProductIds && localProductIds.length > 0) {
  const localExistingUrlsMap = this.parseJsonField(updateProductDto.localExistingUrlsMap) || {};
  
  await this.handleMultipleRelatedProductsWithMerge(
    BigInt(id),
    localProductIds,
    fileMap,
    'Local',
    existingImagesMap,
    localExistingUrlsMap,
  );
}
```

---

## That's it! 

**Total files to modify: 3**
1. DTO file - Add 2 fields
2. Frontend component - Replace one section in onSubmit
3. Backend service - Replace one method + update two method calls

The logic is simple: The frontend now sends which existing images to keep (as a JSON map), and the backend uses only those URLs instead of merging all old images.
