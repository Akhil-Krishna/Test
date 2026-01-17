Yes, I understand the issue! When you update and add new images to existing related/local products, the old images are being replaced instead of being merged with the new ones.

The problem is in the `updateProduct` method. It's **destroying all existing related/local entries** and then creating new ones, but it's only saving the newly uploaded files, not preserving the existing image URLs.

Here's the fix:

## Fix for `product.service.ts`

**Replace the entire `updateProduct` method with this corrected version:**

```typescript
async updateProduct(
  id: string,
  updateProductDto: ProductDto,
  files: Express.Multer.File[],
  userId?: string,
): Promise<GenericResponse<Product>> {
  try {
    const existingProduct = await this.productModel.findOne({
      where: { id },
    });

    if (!existingProduct) {
      throw new BadRequestException('Product not found');
    }

    // Organize files by fieldname
    const fileMap = this.organizeFiles(files);

    const clearAllAdditionalImages =
      updateProductDto.clearAdditionalImages === 'true';

    // Parse JSON fields
    if (typeof updateProductDto.relatedImageUrls === 'string') {
      updateProductDto.relatedImageUrls = JSON.parse(
        updateProductDto.relatedImageUrls,
      );
    }

    if (typeof updateProductDto.localImageUrls === 'string') {
      updateProductDto.localImageUrls = JSON.parse(
        updateProductDto.localImageUrls,
      );
    }

    // Artwork safety checks
    const { data: linkedArtwork } =
      await this.artworkService.getActiveArtwork(id);

    let parsedSpecification = updateProductDto.specification;
    if (typeof parsedSpecification === 'string') {
      try {
        parsedSpecification = JSON.parse(parsedSpecification);
      } catch {
        parsedSpecification = null;
      }
    }

    const isSpecDifferent = !this.deepEqual(
      parsedSpecification,
      existingProduct.specification,
    );

    const normalizeBool = (val: any) => val === true || val === 'true';

    const isExcludeChanged =
      normalizeBool(updateProductDto.excludeProductSpec) !==
      normalizeBool(existingProduct.excludeProductSpec);

    if (linkedArtwork && (isSpecDifferent || isExcludeChanged)) {
      throw new BadRequestException(
        'Cannot update specification because product is used in active artwork',
      );
    }

    // Unique name validation
    if (
      updateProductDto.name &&
      updateProductDto.name !== existingProduct.name
    ) {
      const validationErrors = await uniqueFieldsCheck(
        this.productModel,
        ['name'],
        updateProductDto,
        id,
      );
      handleErrors(validationErrors, 'unique');
    }

    // Build update payload
    const updatedData: any = {
      ...updateProductDto,
      enabled: Boolean(updateProductDto?.enabled),
    };

    if (linkedArtwork) {
      updatedData.specification = existingProduct.specification;
      updatedData.excludeProductSpec = existingProduct.excludeProductSpec;
    } else if (parsedSpecification) {
      updatedData.specification = parsedSpecification;
    }

    // Handle main image
    if (fileMap.image?.[0]) {
      updatedData.image = await this.documentService.uploadDo(fileMap.image[0]);
    } else if (updateProductDto.image === 'null') {
      updatedData.image = null;
    } else {
      updatedData.image = existingProduct.image;
    }

    // Handle additional images
    if (clearAllAdditionalImages) {
      updatedData.additionalImages = [];
    } else {
      const newFiles = fileMap.additionalImages || [];
      const existingUrls = Array.isArray(updateProductDto.additionalImageUrls)
        ? updateProductDto.additionalImageUrls
        : updateProductDto.additionalImageUrls
          ? [updateProductDto.additionalImageUrls]
          : [];

      if (newFiles.length > 0 || existingUrls.length > 0) {
        const uploaded: string[] = [...existingUrls];
        for (const file of newFiles) {
          uploaded.push(await this.documentService.uploadDo(file));
        }
        updatedData.additionalImages = uploaded;
      } else {
        updatedData.additionalImages = existingProduct.additionalImages;
      }
    }

    // 🔥 NEW: Fetch existing related/local products to preserve images
    const existingRelatedLocal = await this.relatedLocalImageModel.findAll({
      where: { productId: BigInt(id) },
      raw: true,
    });

    // Create a map of existing images by product code and type
    const existingImagesMap = new Map<string, string[]>();
    for (const item of existingRelatedLocal) {
      const product = await this.productModel.findOne({
        where: { id: item.relatedLocalProductId },
        attributes: ['temporaryCode'],
        raw: true,
      });
      if (product) {
        const key = `${item.productType}_${product.temporaryCode}`;
        existingImagesMap.set(key, item.image || []);
      }
    }

    // Delete all existing related/local products for this product
    await this.relatedLocalImageModel.destroy({
      where: { productId: BigInt(id) },
    });

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

    // Update product
    await this.productModel.update(updatedData, {
      where: { id },
    });

    const updatedProduct = await this.productModel.findOne({
      where: { id },
      raw: true,
    });

    const compare = compareValues(existingProduct, updatedProduct);

    await this.activityLogService.createActivityLog(
      {
        message: `Product ${updatedProduct?.name} has been updated.`,
        type: 'Update',
        module: this.productModel.name,
        entityId: id,
        oldData: existingProduct,
        newData: updatedProduct,
        changedValue: compare,
      },
      userId,
    );

    return {
      message: 'Product updated successfully',
      data: updatedProduct,
    };
  } catch (error) {
    if (error.status && error.status !== 500) throw error;
    throw new InternalServerErrorException(error?.message || error);
  }
}
```

**Add this new helper method right after the existing `handleMultipleRelatedProducts` method:**

```typescript
/**
 * Handle multiple related/local products with their images - MERGE existing images
 */
private async handleMultipleRelatedProductsWithMerge(
  productId: bigint,
  productCodes: string[],
  fileMap: Record<string, Express.Multer.File[]>,
  productType: 'Related' | 'Local',
  existingImagesMap: Map<string, string[]>,
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

    // Get existing images for this product
    const existingImagesKey = `${productType}_${code}`;
    const existingImages = existingImagesMap.get(existingImagesKey) || [];

    // Get NEW images for this specific product
    const imageFieldName = `${prefix}_${index}`;
    const imageFiles = fileMap[imageFieldName] || [];

    // Upload NEW images
    const newUploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const url = await this.documentService.uploadDo(file);
      newUploadedUrls.push(url);
    }

    // 🔥 MERGE: Combine existing images with newly uploaded ones
    const mergedImages = [...existingImages, ...newUploadedUrls];

    // Create entry in RelatedLocalImages table with merged images
    if (mergedImages.length > 0) {
      await this.relatedLocalImageModel.create({
        productId: productId,
        relatedLocalProductId: relatedProduct.id,
        productType: productType,
        image: mergedImages,
      });
    }
  }
}
```

## Summary of Changes

The key changes are:

1. **Before deleting** existing related/local products, we now fetch them and store their images in a `Map`
2. Created a new helper method `handleMultipleRelatedProductsWithMerge` that:
   - Gets existing images for each product from the map
   - Uploads new images
   - **Merges** old and new images together
   - Saves the combined array

This way, when you add new images to an existing related/local product, the old images are preserved and the new ones are appended to the array!
