# Incremental Changes for Dynamic Product Import Boxes

## STEP 1: Add New State Variables
**Location:** After line with `const [productInputValues, setProductInputValues] = useState<string>("");`

```javascript
// NEW STATE: Track multiple related and local products
const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
const [localProducts, setLocalProducts] = useState<any[]>([]);
```

---

## STEP 2: Add New Handler Functions
**Location:** After the `debouncedProductSearchs` function (around line 120)

```javascript
// NEW: Initialize products from existing data
useEffect(() => {
  if (data && id) {
    if ((data as any)?.relatedProduct) {
      setRelatedProducts([{
        id: Date.now(),
        productId: {
          value: (data as any).relatedProduct.temporaryCode,
          label: (data as any).relatedProduct.temporaryCode,
        },
        images: (data as any).relatedProduct.images || [],
        inputValue: ""
      }]);
    }
    
    if ((data as any)?.localProduct) {
      setLocalProducts([{
        id: Date.now(),
        productId: {
          value: (data as any).localProduct.temporaryCode,
          label: (data as any).localProduct.temporaryCode,
        },
        images: (data as any).localProduct.images || [],
        inputValue: ""
      }]);
    }
  }
}, [data, id]);

// NEW: Function to add a new related product box
const handleAddRelatedProduct = () => {
  setRelatedProducts([...relatedProducts, { id: Date.now(), productId: null, images: [], inputValue: "" }]);
};

// NEW: Function to add a new local product box
const handleAddLocalProduct = () => {
  setLocalProducts([...localProducts, { id: Date.now(), productId: null, images: [], inputValue: "" }]);
};

// NEW: Function to remove a related product box
const handleRemoveRelatedProduct = (id: number) => {
  setRelatedProducts(relatedProducts.filter(p => p.id !== id));
};

// NEW: Function to remove a local product box
const handleRemoveLocalProduct = (id: number) => {
  setLocalProducts(localProducts.filter(p => p.id !== id));
};

// NEW: Get already selected product IDs to disable them in dropdowns
const getDisabledRelatedProductIds = (currentId: number) => {
  return relatedProducts
    .filter(p => p.id !== currentId && p.productId)
    .map(p => p.productId.value);
};

const getDisabledLocalProductIds = (currentId: number) => {
  return localProducts
    .filter(p => p.id !== currentId && p.productId)
    .map(p => p.productId.value);
};

// NEW: Filter products excluding already selected ones
const getFilteredRelatedProducts = (currentId: number) => {
  const disabled = getDisabledRelatedProductIds(currentId);
  return products.filter((p: any) => !disabled.includes(p.value));
};

const getFilteredLocalProducts = (currentId: number) => {
  const disabled = getDisabledLocalProductIds(currentId);
  return productss.filter((p: any) => !disabled.includes(p.value));
};

// NEW: Get product name by code
const getProductNameByCode = (code: string, isRelated: boolean) => {
  const items = isRelated ? (productData as any)?.items : (productDatas as any)?.items;
  const product = items?.find((p: any) => p.temporaryCode === code);
  return product?.name || "";
};
```

---

## STEP 3: Update onSubmit Function
**Location:** Inside `onSubmit` function, after `payload.append("specification", JSON.stringify(formData.specification));`

**ADD THIS CODE:**
```javascript
// NEW: Append multiple related products
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

// NEW: Append multiple local products
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

**Location:** At the end of `onSubmit`, in the `if (response)` block, add:

```javascript
if (response) {
  setSubmitted(false);
  setRemovedSpecs([]);
  setRelatedProducts([]);  // ADD THIS
  setLocalProducts([]);    // ADD THIS
}
```

---

## STEP 4: Replace ABMTabPanel index={3} Content
**Location:** Find `<ABMTabPanel value={activeTab} index={3}>` and **REPLACE EVERYTHING INSIDE IT** with:

```jsx
<ABMTabPanel value={activeTab} index={3}>
  <Grid container alignItems="stretch" columnSpacing={4}>
    {productForm.errors.additionalImages && (
      <Grid item xs={12}>
        <ErrorMessage message={productForm.errors.additionalImages as string} />
      </Grid>
    )}
    <Grid item md={6} xs={12}>
      <FileInput
        form={productForm}
        fieldProps={{ id: "file", label: "Product image", name: "image", type: "file" }}
        setFlag={setFlag}
        flag={flag}
        error={Boolean(productForm.errors.image && productForm.touched.image)}
      />
      {Boolean(productForm.errors.image && productForm.touched.image) || flag ? (
        <FormHelperText error>{String(productForm?.errors?.image)}</FormHelperText>
      ) : null}
    </Grid>
    <Grid item md={6} xs={12}>
      <MultipleFileInput
        form={productForm}
        fieldProps={{ id: "gallery", label: "Additional images", name: "additionalImages", type: "file" }}
        setFlag={setFlag}
        flag={flag}
      />
    </Grid>
  </Grid>

  {/* RELATED PRODUCTS SECTION */}
  <Grid container alignItems="stretch" columnSpacing={4} mt={3}>
    <Grid item xs={12}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Import Related Product Code
        </Typography>
        <Tooltip title="Add Related Product">
          <IconButton
            color="primary"
            onClick={handleAddRelatedProduct}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              '&:hover': { backgroundColor: '#1565c0' },
              width: 40,
              height: 40
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Box>
    </Grid>

    {relatedProducts.map((relatedProduct, index) => (
      <Grid item md={6} xs={12} key={relatedProduct.id}>
        <Box
          sx={{
            width: "100%",
            border: "1px dashed #B0B0B0",
            borderRadius: 2,
            p: 2,
            position: 'relative',
            backgroundColor: '#fafafa'
          }}
        >
          {relatedProducts.length > 1 && (
            <IconButton
              onClick={() => handleRemoveRelatedProduct(relatedProduct.id)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'error.main',
                zIndex: 1
              }}
              size="small"
            >
              <DeleteOutline />
            </IconButton>
          )}

          <Grid className="productNames">
            <Grid item xs={12}>
              <ZSAutocomplete
                label="Product Id"
                inputValue={relatedProduct.inputValue || ""}
                options={getFilteredRelatedProducts(relatedProduct.id)}
                placeholder={relatedProduct.productId ? "" : "Select Product Id"}
                onInputChange={(e: any, val: any, reason: string) => {
                  const updated = relatedProducts.map(p =>
                    p.id === relatedProduct.id ? { ...p, inputValue: val } : p
                  );
                  setRelatedProducts(updated);
                  debouncedProductSearch(val);
                }}
                value={relatedProduct.productId}
                refetchFunction={(searchString: string) => {
                  debouncedProductSearch(searchString);
                }}
                setValue={(val: any) => {
                  const updated = relatedProducts.map(p =>
                    p.id === relatedProduct.id
                      ? {
                          ...p,
                          productId: val ? { value: val.value, label: val.label } : null
                        }
                      : p
                  );
                  setRelatedProducts(updated);
                }}
              />
            </Grid>

            <TextField
              value={relatedProduct.productId?.value 
                ? getProductNameByCode(relatedProduct.productId.value, true)
                : ""
              }
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              placeholder="Product code will appear here"
              className="SelectedProductName"
              sx={{ mt: 2 }}
            />
          </Grid>

          <Grid item xs={12} mt={2}>
            <MultipleFileInput
              form={{
                ...productForm,
                values: {
                  ...productForm.values,
                  [`relatedImages_${relatedProduct.id}`]: relatedProduct.images || []
                },
                setFieldValue: (field: string, value: any) => {
                  if (field === `relatedImages_${relatedProduct.id}`) {
                    const updated = relatedProducts.map(p =>
                      p.id === relatedProduct.id ? { ...p, images: value } : p
                    );
                    setRelatedProducts(updated);
                  } else {
                    productForm.setFieldValue(field, value);
                  }
                }
              }}
              fieldProps={{
                id: `gallery-related-${relatedProduct.id}`,
                label: "Related Product Images",
                name: `relatedImages_${relatedProduct.id}`,
                type: "file"
              }}
              setFlag={setFlag}
              flag={flag}
            />
          </Grid>
        </Box>
      </Grid>
    ))}
  </Grid>

  {/* LOCAL PRODUCTS SECTION */}
  <Grid container alignItems="stretch" columnSpacing={4} mt={3}>
    <Grid item xs={12}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Local Related Product Code
        </Typography>
        <Tooltip title="Add Local Product">
          <IconButton
            color="primary"
            onClick={handleAddLocalProduct}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              '&:hover': { backgroundColor: '#1565c0' },
              width: 40,
              height: 40
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Box>
    </Grid>

    {localProducts.map((localProduct, index) => (
      <Grid item md={6} xs={12} key={localProduct.id}>
        <Box
          sx={{
            width: "100%",
            border: "1px dashed #B0B0B0",
            borderRadius: 2,
            p: 2,
            position: 'relative',
            backgroundColor: '#fafafa'
          }}
        >
          {localProducts.length > 1 && (
            <IconButton
              onClick={() => handleRemoveLocalProduct(localProduct.id)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'error.main',
                zIndex: 1
              }}
              size="small"
            >
              <DeleteOutline />
            </IconButton>
          )}

          <Grid className="productNames">
            <Grid item xs={12}>
              <ZSAutocomplete
                label="Product Id"
                inputValue={localProduct.inputValue || ""}
                options={getFilteredLocalProducts(localProduct.id)}
                placeholder={localProduct.productId ? "" : "Select Product Id"}
                onInputChange={(e: any, val: any, reason: string) => {
                  const updated = localProducts.map(p =>
                    p.id === localProduct.id ? { ...p, inputValue: val } : p
                  );
                  setLocalProducts(updated);
                  debouncedProductSearchs(val);
                }}
                value={localProduct.productId}
                refetchFunction={(searchString: string) => {
                  debouncedProductSearchs(searchString);
                }}
                setValue={(val: any) => {
                  const updated = localProducts.map(p =>
                    p.id === localProduct.id
                      ? {
                          ...p,
                          productId: val ? { value: val.value, label: val.label } : null
                        }
                      : p
                  );
                  setLocalProducts(updated);
                }}
              />
            </Grid>

            <TextField
              value={localProduct.productId?.value 
                ? getProductNameByCode(localProduct.productId.value, false)
                : ""
              }
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              placeholder="Product code will appear here"
              className="SelectedProductName"
              sx={{ mt: 2 }}
            />
          </Grid>

          <Grid item xs={12} mt={2}>
            <MultipleFileInput
              form={{
                ...productForm,
                values: {
                  ...productForm.values,
                  [`localImages_${localProduct.id}`]: localProduct.images || []
                },
                setFieldValue: (field: string, value: any) => {
                  if (field === `localImages_${localProduct.id}`) {
                    const updated = localProducts.map(p =>
                      p.id === localProduct.id ? { ...p, images: value } : p
                    );
                    setLocalProducts(updated);
                  } else {
                    productForm.setFieldValue(field, value);
                  }
                }
              }}
              fieldProps={{
                id: `gallery-local-${localProduct.id}`,
                label: "Local Product Images",
                name: `localImages_${localProduct.id}`,
                type: "file"
              }}
              setFlag={setFlag}
              flag={flag}
            />
          </Grid>
        </Box>
      </Grid>
    ))}
  </Grid>
</ABMTabPanel>
```

---

## STEP 5: Update Import Statement
**Location:** At the top of the file, find the line with `DeleteOutline` import

**CHANGE FROM:**
```javascript
import { DeleteOutline } from "@mui/icons-material";
```

**TO:**
```javascript
import { DeleteOutline, Add } from "@mui/icons-material";
```

---

## BACKEND CHANGES (NestJS)

### In your DTO file (e.g., `update-product.dto.ts`):

```typescript
@IsOptional()
@IsArray()
relatedProductIds?: string[];

@IsOptional()
@IsArray()
localProductIds?: string[];
```

### In your Controller (e.g., `product.controller.ts`):

**Update the `@UseInterceptors` decorator:**

```typescript
@UseInterceptors(FileFieldsInterceptor([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 },
  { name: 'relatedImages_0', maxCount: 5 },
  { name: 'relatedImages_1', maxCount: 5 },
  { name: 'relatedImages_2', maxCount: 5 },
  { name: 'relatedImages_3', maxCount: 5 },
  { name: 'relatedImages_4', maxCount: 5 },
  { name: 'localImages_0', maxCount: 5 },
  { name: 'localImages_1', maxCount: 5 },
  { name: 'localImages_2', maxCount: 5 },
  { name: 'localImages_3', maxCount: 5 },
  { name: 'localImages_4', maxCount: 5 },
]))
```

**Inside your update method, parse the JSON:**

```typescript
// Parse JSON arrays
if (updateProductDto.relatedProductIds) {
  updateProductDto.relatedProductIds = JSON.parse(updateProductDto.relatedProductIds as any);
}

if (updateProductDto.localProductIds) {
  updateProductDto.localProductIds = JSON.parse(updateProductDto.localProductIds as any);
}

// Group images by index
const relatedImagesMap = {};
const localImagesMap = {};

Object.keys(files).forEach(key => {
  if (key.startsWith('relatedImages_')) {
    const index = key.split('_')[1];
    relatedImagesMap[index] = files[key];
  } else if (key.startsWith('localImages_')) {
    const index = key.split('_')[1];
    localImagesMap[index] = files[key];
  }
});

// Pass to service
return this.productService.update(id, updateProductDto, files, relatedImagesMap, localImagesMap);
```

---

## Summary
- **Frontend**: 5 changes to make
- **Backend**: Update DTO and Controller to handle arrays
- No existing code removed, only additions made
