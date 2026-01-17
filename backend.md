Based on your backend code, here are the **exact changes** you need to make:

---

## **BACKEND CHANGES**

### **1. DTO Changes (product-input.dto.ts)**

**FIND these two properties:**
```typescript
@ApiProperty()
@IsString()
relatedProductId?: string | null;

@ApiProperty()
@IsString()
localProductId?: string | null;
```

**REPLACE them with:**
```typescript
@ApiProperty()
@IsOptional()
@Transform(({ value }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
})
@IsArray()
@IsString({ each: true })
relatedProductIds?: string[];

@ApiProperty()
@IsOptional()
@Transform(({ value }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
})
@IsArray()
@IsString({ each: true })
localProductIds?: string[];
```

---

### **2. Controller Changes (product.controller.ts)**

#### **Change 1: Update POST method**

**FIND:**
```typescript
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImages', maxCount: 50 },
    { name: 'relatedImages', maxCount: 50 },
  ]),
)
```

**REPLACE with:**
```typescript
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImages', maxCount: 50 },
    { name: 'relatedImages_0', maxCount: 50 },
    { name: 'relatedImages_1', maxCount: 50 },
    { name: 'relatedImages_2', maxCount: 50 },
    { name: 'relatedImages_3', maxCount: 50 },
    { name: 'relatedImages_4', maxCount: 50 },
    { name: 'localImages_0', maxCount: 50 },
    { name: 'localImages_1', maxCount: 50 },
    { name: 'localImages_2', maxCount: 50 },
    { name: 'localImages_3', maxCount: 50 },
    { name: 'localImages_4', maxCount: 50 },
  ]),
)
```

#### **Change 2: Update POST create method body**

**FIND:**
```typescript
async create(
  @Body() createProductDto: ProductDto,
  @UploadedFiles()
  files: {
    image?: Express.Multer.File[];
    additionalImages?: Express.Multer.File[];
    relatedImages?: Express.Multer.File[];
    localImages?: Express.Multer.File[];
  },
  @CurrentUser() user: User,
): Promise<GenericResponse<Product>> {
  const image = files.image?.[0] ?? null;
  const additionalImages = files.additionalImages ?? [];
  const relatedImages = files.relatedImages ?? [];
  const localImages = files.relatedImages ?? [];

  return this.productService.createProduct(
    createProductDto,
    image,
    additionalImages,
    relatedImages,
    localImages,
    user.id?.toString(),
  );
}
```

**REPLACE with:**
```typescript
async create(
  @Body() createProductDto: ProductDto,
  @UploadedFiles() files: any,
  @CurrentUser() user: User,
): Promise<GenericResponse<Product>> {
  const image = files.image?.[0] ?? null;
  const additionalImages = files.additionalImages ?? [];
  
  // Group related and local images by index
  const relatedImagesMap: Record<number, Express.Multer.File[]> = {};
  const localImagesMap: Record<number, Express.Multer.File[]> = {};
  
  Object.keys(files).forEach(key => {
    if (key.startsWith('relatedImages_')) {
      const index = parseInt(key.split('_')[1]);
      relatedImagesMap[index] = files[key];
    } else if (key.startsWith('localImages_')) {
      const index = parseInt(key.split('_')[1]);
      localImagesMap[index] = files[key];
    }
  });

  return this.productService.createProduct(
    createProductDto,
    image,
    additionalImages,
    relatedImagesMap,
    localImagesMap,
    user.id?.toString(),
  );
}
```

#### **Change 3: Update PUT method**

**FIND:**
```typescript
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImages', maxCount: 10 },
    { name: 'relatedImages', maxCount: 10 },
    { name: 'localImages', maxCount: 10 },
  ]),
)
```

**REPLACE with:**
```typescript
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImages', maxCount: 10 },
    { name: 'relatedImages_0', maxCount: 10 },
    { name: 'relatedImages_1', maxCount: 10 },
    { name: 'relatedImages_2', maxCount: 10 },
    { name: 'relatedImages_3', maxCount: 10 },
    { name: 'relatedImages_4', maxCount: 10 },
    { name: 'localImages_0', maxCount: 10 },
    { name: 'localImages_1', maxCount: 10 },
    { name: 'localImages_2', maxCount: 10 },
    { name: 'localImages_3', maxCount: 10 },
    { name: 'localImages_4', maxCount: 10 },
  ]),
)
```

#### **Change 4: Update PUT update method body**

**FIND:**
```typescript
async update(
  @Param('id') id: string,
  @Body() updateProductDto: ProductDto,
  @UploadedFiles()
  files: {
    image?: Express.Multer.File[];
    additionalImages?: Express.Multer.File[];
    relatedImages?: Express.Multer.File[];
  },
  @CurrentUser() user: User,
): Promise<GenericResponse<Product>> {
  return this.productService.updateProduct(
    id,
    updateProductDto,
    files,
    user.id?.toString(),
  );
}
```

**REPLACE with:**
```typescript
async update(
  @Param('id') id: string,
  @Body() updateProductDto: ProductDto,
  @UploadedFiles() files: any,
  @CurrentUser() user: User,
): Promise<GenericResponse<Product>> {
  // Group related and local images by index
  const relatedImagesMap: Record<number, Express.Multer.File[]> = {};
  const localImagesMap: Record<number, Express.Multer.File[]> = {};
  
  Object.keys(files || {}).forEach(key => {
    if (key.startsWith('relatedImages_')) {
      const index = parseInt(key.split('_')[1]);
      relatedImagesMap[index] = files[key];
    } else if (key.startsWith('localImages_')) {
      const index = parseInt(key.split('_')[1]);
      localImagesMap[index] = files[key];
    }
  });

  return this.productService.updateProduct(
    id,
    updateProductDto,
    files,
    relatedImagesMap,
    localImagesMap,
    user.id?.toString(),
  );
}
```

---

### **3. Service Changes (product.service.ts)**

You need to update your `createProduct` and `updateProduct` method signatures to accept the new parameters:

**Update method signature from:**
```typescript
async createProduct(
  createProductDto: ProductDto,
  image: Express.Multer.File,
  additionalImages: Express.Multer.File[],
  relatedImages: Express.Multer.File[],
  localImages: Express.Multer.File[],
  userId: string,
)
```

**TO:**
```typescript
async createProduct(
  createProductDto: ProductDto,
  image: Express.Multer.File,
  additionalImages: Express.Multer.File[],
  relatedImagesMap: Record<number, Express.Multer.File[]>,
  localImagesMap: Record<number, Express.Multer.File[]>,
  userId: string,
)
```

**And update method signature from:**
```typescript
async updateProduct(
  id: string,
  updateProductDto: ProductDto,
  files: any,
  userId: string,
)
```

**TO:**
```typescript
async updateProduct(
  id: string,
  updateProductDto: ProductDto,
  files: any,
  relatedImagesMap: Record<number, Express.Multer.File[]>,
  localImagesMap: Record<number, Express.Multer.File[]>,
  userId: string,
)
```

---

## **Summary of Changes:**

1. **DTO**: Changed `relatedProductId` and `localProductId` (singular strings) to `relatedProductIds` and `localProductIds` (arrays)
2. **Controller POST**: Updated file interceptor to handle indexed files + grouped files in method
3. **Controller PUT**: Updated file interceptor to handle indexed files + grouped files in method
4. **Service**: Update method signatures to accept `Record<number, Express.Multer.File[]>` instead of `Express.Multer.File[]`

The service implementation logic will depend on how you want to save multiple products and their images. Let me know if you need help with the service implementation!
