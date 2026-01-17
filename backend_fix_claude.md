After carefully analyzing your code, I can see the issue. The frontend is correctly preparing multiple related/local products, but the backend is not set up to handle them. Here are all the changes needed:

## Backend Changes

### 1. **product.controller.ts** - Update file upload configuration

**Location**: `product.controller.ts`

**Change**: Update the `FileFieldsInterceptor` to accept dynamic field names for multiple products

```typescript
@Put(':id')
@UseGuards(PermissionGuard('Product-Update'))
@UseInterceptors(new EntityExistsInterceptor(Product, 'id', 'id'))
@UseInterceptors(AnyFilesInterceptor()) // Change this line
@ApiConsumes('multipart/form-data')
async update(
  @Param('id') id: string,
  @Body() updateProductDto: ProductDto,
  @UploadedFiles() files: Express.Multer.File[], // Change this line
  @CurrentUser() user: User,
): Promise<GenericResponse<Product>> {
  return this.productService.updateProduct(
    id,
    updateProductDto,
    files, // Pass all files
    user.id?.toString(),
  );
}

@Post()
@UseGuards(PermissionGuard('Product-Create'))
@UseInterceptors(AnyFilesInterceptor()) // Change this line
@ApiConsumes('multipart/form-data')
async create(
  @Body() createProductDto: ProductDto,
  @UploadedFiles() files: Express.Multer.File[], // Change this line
  @CurrentUser() user: User,
): Promise<GenericResponse<Product>> {
  return this.productService.createProduct(
    createProductDto,
    files, // Pass all files
    user.id?.toString(),
  );
}
```

### 2. **product.service.ts** - Complete rewrite of create and update methods

**Location**: `product.service.ts`

**Replace the entire `createProduct` method:**

```typescript
async createProduct(
  createProductDto: ProductDto,
  files: Express.Multer.File[],
  userId?: string,
): Promise<GenericResponse<Product>> {
  try {
    const validationErrors = await uniqueFieldsCheck(
      this.productModel,
      ['name'],
      createProductDto,
    );
    handleErrors(validationErrors, 'unique');
    
    const specification =
      typeof createProductDto.specification === 'string'
        ? JSON.parse(createProductDto.specification)
        : createProductDto.specification;
    const productTypeId = Number(createProductDto.productTypeId);

    const templates = await this.productTypeTemplateModel.findAll({
      where: { productTypeId },
      order: [['templatedUniqueId', 'ASC']],
    });

    if (!templates.length) {
      throw new BadRequestException(
        'No product type templates found for this product type',
      );
    }

    const templateOptions = templates.map((t) => ({
      templateId: t.id,
      fieldName: t.fieldName,
      fieldType: t.fieldType,
      multiple: t.multiple,
      options: t.option ?? [],
    }));

    // Organize files by fieldname
    const fileMap = this.organizeFiles(files);

    // Upload main image
    const imageUrl = fileMap.image?.[0]
      ? await this.documentService.uploadDo(fileMap.image[0])
      : null;

    // Upload additional images
    const additionalImageUrls =
      fileMap.additionalImages?.length > 0
        ? await Promise.all(
            fileMap.additionalImages.map((file) =>
              this.documentService.uploadDo(file),
            ),
          )
        : [];

    // Create product first
    const product = await this.productModel.create({
      ...createProductDto,
      image: imageUrl || null,
      enabled: Boolean(createProductDto.enabled),
      additionalImages: additionalImageUrls,
      specification,
      excludeProductSpec: createProductDto?.excludeProductSpec,
      recordProductHistory: createProductDto?.recordProductHistory,
      templateOptions,
    });

    // Handle multiple related products
    const relatedProductIds = this.parseJsonField(createProductDto.relatedProductIds);
    if (relatedProductIds && relatedProductIds.length > 0) {
      await this.handleMultipleRelatedProducts(
        product.id,
        relatedProductIds,
        fileMap,
        'Related',
      );
    }

    // Handle multiple local products
    const localProductIds = this.parseJsonField(createProductDto.localProductIds);
    if (localProductIds && localProductIds.length > 0) {
      await this.handleMultipleRelatedProducts(
        product.id,
        localProductIds,
        fileMap,
        'Local',
      );
    }

    await this.activityLogService.createActivityLog(
      {
        message: `Product ${createProductDto?.name} has been created.`,
        type: 'Create',
        module: this.productModel.name,
        entityId: product.id?.toString(),
        newData: product,
      },
      userId,
    );

    return { message: 'Product created successfully', data: product };
  } catch (error) {
    if (error.status !== 500) throw error;
    throw new InternalServerErrorException(error);
  }
}
```

**Replace the entire `updateProduct` method:**

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

    // Delete all existing related/local products for this product
    await this.relatedLocalImageModel.destroy({
      where: { productId: BigInt(id) },
    });

    // Handle multiple related products
    const relatedProductIds = this.parseJsonField(updateProductDto.relatedProductIds);
    if (relatedProductIds && relatedProductIds.length > 0) {
      await this.handleMultipleRelatedProducts(
        BigInt(id),
        relatedProductIds,
        fileMap,
        'Related',
      );
    }

    // Handle multiple local products
    const localProductIds = this.parseJsonField(updateProductDto.localProductIds);
    if (localProductIds && localProductIds.length > 0) {
      await this.handleMultipleRelatedProducts(
        BigInt(id),
        localProductIds,
        fileMap,
        'Local',
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

**Add these helper methods to the `ProductService` class:**

```typescript
/**
 * Organize uploaded files into a map by fieldname
 */
private organizeFiles(files: Express.Multer.File[]): Record<string, Express.Multer.File[]> {
  const fileMap: Record<string, Express.Multer.File[]> = {};
  
  for (const file of files) {
    const fieldname = file.fieldname;
    if (!fileMap[fieldname]) {
      fileMap[fieldname] = [];
    }
    fileMap[fieldname].push(file);
  }
  
  return fileMap;
}

/**
 * Parse JSON field safely
 */
private parseJsonField(field: any): any[] | null {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  }
  return Array.isArray(field) ? field : null;
}

/**
 * Handle multiple related/local products with their images
 */
private async handleMultipleRelatedProducts(
  productId: bigint,
  productCodes: string[],
  fileMap: Record<string, Express.Multer.File[]>,
  productType: 'Related' | 'Local',
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

    // Get images for this specific product
    const imageFieldName = `${prefix}_${index}`;
    const imageFiles = fileMap[imageFieldName] || [];

    // Upload images
    const uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const url = await this.documentService.uploadDo(file);
      uploadedUrls.push(url);
    }

    // Create entry in RelatedLocalImages table
    if (uploadedUrls.length > 0 || productType) {
      await this.relatedLocalImageModel.create({
        productId: productId,
        relatedLocalProductId: relatedProduct.id,
        productType: productType,
        image: uploadedUrls,
      });
    }
  }
}
```

### 3. **product-input.dto.ts** - Add new fields

**Location**: `dtos/product-input.dto.ts`

**Add these fields to your DTO:**

```typescript
@ApiPropertyOptional()
relatedProductIds?: string; // JSON stringified array

@ApiPropertyOptional()
localProductIds?: string; // JSON stringified array
```

### 4. **product.service.ts** - Update `getProductById` method

**Replace the existing `getProductById` method with:**

```typescript
async getProductById(id: string): Promise<GenericResponse<Product>> {
  try {
    const product = await this.productModel.findOne({
      where: { id: Number(id) },
      include: [{ model: ProductType, attributes: ['id', 'name'] }],
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
    });

    if (!product) {
      return { message: 'Product not found', data: null };
    }

    // Fetch ALL related and local products
    const relatedLocalList = await this.relatedLocalImageModel.findAll({
      where: { productId: Number(id) },
      attributes: ['relatedLocalProductId', 'image', 'productType'],
      raw: true,
    });

    // Separate related and local products
    const relatedEntries = relatedLocalList.filter(
      (item) => item.productType === 'Related',
    );
    const localEntries = relatedLocalList.filter(
      (item) => item.productType === 'Local',
    );

    // Fetch related products with details
    const relatedProducts = [];
    for (const entry of relatedEntries) {
      if (entry.relatedLocalProductId) {
        const rp = await this.productModel.findOne({
          where: { id: Number(entry.relatedLocalProductId) },
          attributes: ['id', 'temporaryCode', 'name'],
          raw: true,
        });

        if (rp) {
          relatedProducts.push({
            id: rp.id,
            temporaryCode: rp.temporaryCode,
            name: rp.name,
            images: entry.image ?? [],
          });
        }
      }
    }

    // Fetch local products with details
    const localProducts = [];
    for (const entry of localEntries) {
      if (entry.relatedLocalProductId) {
        const lp = await this.productModel.findOne({
          where: { id: Number(entry.relatedLocalProductId) },
          attributes: ['id', 'temporaryCode', 'name'],
          raw: true,
        });

        if (lp) {
          localProducts.push({
            id: lp.id,
            temporaryCode: lp.temporaryCode,
            name: lp.name,
            images: entry.image ?? [],
          });
        }
      }
    }

    const plainProduct = product.get({ plain: true });

    return {
      message: 'Product found',
      data: {
        ...plainProduct,
        relatedProducts, // Array of related products
        localProducts,   // Array of local products
      },
    };
  } catch (error) {
    if (error.status && error.status !== 500) throw error;
    throw new InternalServerErrorException(error);
  }
}
```

## Frontend Changes (Minor adjustment needed)

### **component.jsx** - Update initialization useEffect

**Location**: `component.jsx` around line 275

**Replace the existing useEffect with:**

```javascript
useEffect(() => {
  if (data && id) {
    // Handle multiple related products
    if ((data as any)?.relatedProducts && (data as any).relatedProducts.length > 0) {
      setRelatedProducts(
        (data as any).relatedProducts.map((rp: any, idx: number) => ({
          id: Date.now() + idx,
          productId: {
            value: rp.temporaryCode,
            label: rp.temporaryCode,
          },
          images: rp.images || [],
          inputValue: ""
        }))
      );
    }
    
    // Handle multiple local products
    if ((data as any)?.localProducts && (data as any).localProducts.length > 0) {
      setLocalProducts(
        (data as any).localProducts.map((lp: any, idx: number) => ({
          id: Date.now() + idx + 1000,
          productId: {
            value: lp.temporaryCode,
            label: lp.temporaryCode,
          },
          images: lp.images || [],
          inputValue: ""
        }))
      );
    }
  }
}, [data, id]);
```

## Summary of Changes

1. **Controller**: Changed to use `AnyFilesInterceptor()` to accept dynamic file field names
2. **Service**: 
   - Added `organizeFiles()` helper to map files by fieldname
   - Added `parseJsonField()` helper to safely parse JSON arrays
   - Added `handleMultipleRelatedProducts()` to process multiple products
   - Updated `createProduct()` to handle multiple related/local products
   - Updated `updateProduct()` to handle multiple related/local products
   - Updated `getProductById()` to return arrays of related/local products
3. **DTO**: Added `relatedProductIds` and `localProductIds` fields
4. **Frontend**: Updated initialization to handle arrays of products

This solution will now correctly save all related and local products with their images to the database!
