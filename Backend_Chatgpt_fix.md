Got it — I read the **entire JSX carefully** 👍
This is a **classic multipart + dynamic field-name problem**, not a UI-only bug.

Right now:

* ✅ UI correctly allows **multiple related/local products**
* ❌ Backend still **expects single relatedProductId + relatedImages**
* ❌ Only the **first card survives**, others are silently ignored

I’ll break this into **exact fixes**, with **file names + code** for **NestJS backend**, and also **one small but critical frontend correction**.

---

# 🔴 ROOT CAUSE (Why only first product reaches backend)

### 1️⃣ Frontend sends **dynamic field names**

You are appending files like:

```ts
payload.append(`relatedImages_${index}`, img);
payload.append(`localImages_${index}`, img);
payload.append("relatedProductIds", JSON.stringify([...]));
payload.append("localProductIds", JSON.stringify([...]));
```

### 2️⃣ NestJS Multer **does NOT auto-capture dynamic keys**

NestJS will only parse:

* fields explicitly listed in `@UploadedFiles()`
* or captured via `AnyFilesInterceptor`

So:

* `relatedImages_0` ✅
* `relatedImages_1` ❌ (ignored)
* `relatedProductIds` parsed as string but not mapped

---

# ✅ REQUIRED BACKEND CHANGES (NestJS)

## 1️⃣ Controller – MUST use `AnyFilesInterceptor`

### 📍 File:

```
src/modules/product/product.controller.ts
```

### ❌ CURRENT (typical wrong pattern)

```ts
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'relatedImages', maxCount: 5 },
    { name: 'localImages', maxCount: 5 },
  ])
)
```

### ✅ REPLACE WITH THIS

```ts
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Post()
@UseInterceptors(AnyFilesInterceptor())
async createProduct(
  @UploadedFiles() files: Express.Multer.File[],
  @Body() body: any,
) {
  return this.productService.create(body, files);
}

@Put(':id')
@UseInterceptors(AnyFilesInterceptor())
async updateProduct(
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[],
  @Body() body: any,
) {
  return this.productService.update(id, body, files);
}
```

🚨 **This is NON-NEGOTIABLE**
Without `AnyFilesInterceptor`, dynamic image keys will never arrive.

---

## 2️⃣ Service – Parse dynamic related/local images properly

### 📍 File:

```
src/modules/product/product.service.ts
```

### ✅ ADD THIS HELPER

```ts
private extractGroupedImages(
  files: Express.Multer.File[],
  prefix: string,
) {
  const map: Record<number, Express.Multer.File[]> = {};

  files.forEach(file => {
    if (file.fieldname.startsWith(prefix)) {
      const index = Number(file.fieldname.replace(`${prefix}_`, ''));
      if (!map[index]) map[index] = [];
      map[index].push(file);
    }
  });

  return map;
}
```

---

## 3️⃣ Parse Product IDs + Map Images

### ✅ INSIDE `create()` / `update()`

```ts
const relatedProductIds: string[] = body.relatedProductIds
  ? JSON.parse(body.relatedProductIds)
  : [];

const localProductIds: string[] = body.localProductIds
  ? JSON.parse(body.localProductIds)
  : [];

const relatedImagesMap = this.extractGroupedImages(files, 'relatedImages');
const localImagesMap = this.extractGroupedImages(files, 'localImages');
```

---

## 4️⃣ Save Multiple Related Products (IMPORTANT)

### ❌ OLD (single)

```ts
product.relatedProduct = {
  productId: body.relatedProductId,
  images: uploadedImages,
};
```

### ✅ NEW (multiple)

```ts
product.relatedProducts = relatedProductIds.map((productId, index) => ({
  productId,
  images: relatedImagesMap[index] || [],
}));
```

Same for local:

```ts
product.localProducts = localProductIds.map((productId, index) => ({
  productId,
  images: localImagesMap[index] || [],
}));
```

---

## 5️⃣ Entity Changes (Required)

### 📍 File:

```
src/modules/product/entities/product.entity.ts
```

### ❌ OLD

```ts
@OneToOne(() => Product)
relatedProduct: Product;
```

### ✅ NEW

```ts
@OneToMany(() => ProductRelation, r => r.parentProduct, { cascade: true })
relatedProducts: ProductRelation[];

@OneToMany(() => ProductRelation, r => r.parentProduct, { cascade: true })
localProducts: ProductRelation[];
```

Create relation entity:

### 📍 NEW FILE:

```
src/modules/product/entities/product-relation.entity.ts
```

```ts
@Entity()
export class ProductRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, p => p.relatedProducts)
  parentProduct: Product;

  @Column()
  productId: string;

  @Column('json', { nullable: true })
  images: string[];
}
```

---

# ⚠️ FRONTEND FIX (CRITICAL)

### ❌ PROBLEM

You are mixing:

* `relatedProductId` (single legacy)
* `relatedProductIds` (new array)

### ✅ FIX

**Remove legacy fields completely**

#### REMOVE from `onSubmit`

```ts
payload.append("relatedProductId", ...)
payload.append("localProductId", ...)
```

#### Backend should rely ONLY on:

```ts
relatedProductIds
localProductIds
```

---

# ✅ FINAL DATA FLOW (After Fix)

| Step                            | Status |
| ------------------------------- | ------ |
| UI multiple cards               | ✅      |
| FormData sends indexed fields   | ✅      |
| NestJS captures all files       | ✅      |
| Service groups images correctly | ✅      |
| DB stores multiple relations    | ✅      |

---

# 🧠 Why this works

* Multer **does not understand indexed names**
* NestJS **must use AnyFilesInterceptor**
* You must **manually group files**
* DB schema must reflect **1-to-many**


