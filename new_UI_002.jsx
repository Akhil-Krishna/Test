/* eslint-disable react-hooks/exhaustive-deps */
import { Checkbox, Container, FormControlLabel, FormHelperText, Grid, IconButton, InputLabel, TextField, Tooltip, Typography } from "@mui/material";
import { setIn, useFormik } from "formik";
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ZSAutocomplete } from "../../../../shared/components/autoComplete";
import FileInput from "../../../../shared/components/fileInput";
import { FormContainer } from "../../../../shared/components/formContainer";
import useLazyQuery from "../../../../shared/components/hooks/useLazyQuery";
import useMutation from "../../../../shared/components/hooks/useMutation";
import useQuery from "../../../../shared/components/hooks/useQuery";
import MultipleFileInput from "../../../../shared/components/multipleFileInput";
import { ZSSelectBox } from "../../../../shared/components/selectBox";
import ToggleSwitch from "../../../../shared/components/switch";
import { ABMTabPanel } from "../../../../shared/components/tabPanel";
import InputTextfield from "../../../../shared/components/textField";
import TitleBar from "../../../../shared/components/titleBar";
import { getLocalStorageData } from "../../../../shared/utils/localStorage";
import { getValidationSchema } from "../../../../shared/validations/schema";
import "./styles.css";
import { BorderPanel } from "../../../../shared/components/tabPanel/borderPanel";
import NoDataFound from "../../../../shared/components/noDataFoundBanner";
import { ErrorMessage } from "../../../../shared/components/errorMessage";
import * as yup from "yup";
import regEx from "../../../../shared/validations/regularExpression";
import { ZSMultiSelectBox } from "../../../../shared/components/multiselectSelectBox";
import { DeleteOutline, Add } from "@mui/icons-material";   //test
import { Box } from "@mui/material"
import { SidebarContext } from "../../../../contexts/SidebarContext";

const Product: FC = () => {
  const { id } = useParams();
  const didAutoJumpRef = useRef(false);
  const { loading: apiLoading, modifyData } = useMutation("/products");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [flag, setFlag] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const { payload } = useContext(SidebarContext);
  const [tabValidationErrors, setTabValidationErrors] = useState<any>(null);
  const visitedTabsRef = useRef<Record<number, boolean>>({});
  const [removedSpecs, setRemovedSpecs] = useState<string[]>([]);
  const [productInputValue, setProductInputValue] =
    useState<string>("");
  const [productInputValues, setProductInputValues] =
    useState<string>("");

        // NEW STATE: Track multiple related and local products
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [localProducts, setLocalProducts] = useState<any[]>([]);


  const tabFields: any = useMemo(
    () => ({
      0: ["name", "description", "productTypeId", "code"],
      1: ["gst", "status"],
      2: ["specification", "size1", "size2"],
      3: ["image", "additionalImages", "relatedImages", "localImages"],
    }),
    []
  );

  const {
    data: productData,
    error: productError,
    fetchData: fetchProductData,
    setCustomSearch: setProductSearch,
  } = useQuery("/product", {
    params: {
      ...payload,
      take: 10,
      sortOrder: "ASC",
      status: true,
    },
  });

  const {
    data: productDatas,
    error: productErrors,
    fetchData: fetchProductDatas,
    setCustomSearch: setProductSearchs,
  } = useQuery("/product", {
    params: {
      ...payload,
      take: 10,
      sortOrder: "ASC",
      status: true,
    },
  });


  const debouncedProductSearch = useMemo(() => {
    let timeout: any;

    return (search: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setProductSearch(search);
      }, 1000);
    };
  }, []);

  const debouncedProductSearchs = useMemo(() => {
    let timeout: any;

    return (search: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setProductSearchs(search);
      }, 1000);
    };
  }, []);
  
  // Test handler
  
  // NEW: Initialize products from existing data


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
  
  
  // -------------------------






  const { error, loading, data: responseData, fetchData } = useLazyQuery(`/product/${id}`, "/products");
  const data = responseData?.data;

  const { data: productTypeData, setCustomSearch: setProductTypeSearch } = useQuery("/product-type", {
    params: { take: 100, sortOrder: "ASC", enabled: true },
  });

  const textFields = [
    { id: "product-code", name: "code", label: "Product Code", type: "text", placeholder: "Enter product code", required: true, tab: 0 },
    { id: "product-name", name: "name", label: "Name", type: "text", placeholder: "Enter name", required: true, tab: 0 },
    { id: "product-gst", name: "gst", label: "GST (%)", type: "number", placeholder: "Enter GST%", required: true, tab: 1 },
    { id: "product-mainImage", name: "image", label: "Main Image", type: "file", placeholder: "Upload main image", required: true, tab: 3 },
    {
      id: "product-additionalImages",
      name: "additionalImages",
      label: "Additional Images",
      type: "file",
      placeholder: "Upload additional images",
      required: false,
      tab: 3,
    },

    {
      id: "product-localImages",
      name: "localImages",
      label: "Local Images",
      type: "file",
      placeholder: "Upload local images",
      required: false,
      tab: 3,
    },

    {
      id: "product-relatedImages",
      name: "relatedImages",
      label: "Related Images",
      type: "file",
      placeholder: "Upload related images",
      required: false,
      tab: 3,
    },
  ];

  const nameSchema = yup.object().shape({
    name: yup
      .string()
      .test("betweenSpaces", "Name has an excessive number of intermediate spaces", (value: any) => {
        if (value?.trim()?.match(regEx.tooManySpace)?.length > 0) return false;
        return true;
      })
      .min(2, "Name must be more than 1 character")
      .max(60, "Name cannot exceed more than 60 characters")
      .required("Required"),
  });

  const commonSchema = getValidationSchema(["description", "customerId", "productTypeId", "gst", "code", "status",]);


  const productForm = useFormik({
    initialValues: {
      enabled: (data as any)?.enabled ?? true,
      excludeProductSpec: (data as any)?.excludeProductSpec ?? false,
      recordProductHistory: (data as any)?.recordProductHistory ?? true,
      printImage: (data as any)?.printImage ?? true,
      recordStockTransaction: (data as any)?.recordStockTransaction ?? false,
      name: (data as any)?.name ?? "",
      status: (data as any)?.status ?? "",
      code: (data as any)?.temporaryCode ?? "",
      description: (data as any)?.description ?? "",
      productTypeId: (data as any)?.productTypeId ?? null,
      gst: (data as any)?.gst ?? "",
      specification: {
        size1: (data as any)?.specification?.size1 ?? "",
        size2: (data as any)?.specification?.size2 ?? "",
        ...(data as any)?.specification ?? {}
      }
      ,
      image: (data as any)?.image ?? null,
      // relatedImages: (data as any)?.relatedImages ?? null,
      // localImages: (data as any)?.localImages ?? null,
      additionalImages: (data as any)?.additionalImages ?? [],

      // relatedImages: (data as any)?.relatedImages ?? [],
      relatedImages: (data as any)?.relatedProduct?.images ?? [],
      localImages: (data as any)?.localProduct?.images ?? [],
      // localProductImages: (data as any)?.localProductImages ?? [],
      relatedProductId: (data as any)?.relatedProduct
        ? {
          value: (data as any).relatedProduct.temporaryCode,
          label: (data as any).relatedProduct.temporaryCode,
        }
        : null,
      relatedProductType: (data as any)?.relatedProduct ? "Related" : null,
      localProductId: (data as any)?.localProduct
        ? {
          value: (data as any).localProduct.temporaryCode,
          label: (data as any).localProduct.temporaryCode,
        }
        : null,
      localProductType: (data as any)?.localProduct ? "Local" : null,
    },

    enableReinitialize: true,
    validationSchema: nameSchema.concat(commonSchema),
    validate: (values) => {
      let errors: any = {};
      const mainImageCount = values.image ? 1 : 0;
      const additionalCount = Array.isArray(values.additionalImages) ? values.additionalImages?.length : 0;
      if (mainImageCount + additionalCount > 5) {
        errors.additionalImages = "You cannot upload more than 5 images in total";
      }


      const relatedCount = values.relatedImages
        ? Object.values(values.relatedImages)
          .flat()
          .length
        : 0;

      if (mainImageCount + relatedCount > 5) {
        errors.relatedProductImages =
          "You cannot upload more than 5 images in total";
      }

      const localCount = values.localImages
        ? Object.values(values.localImages)
          .flat()
          .length
        : 0;

      if (mainImageCount + localCount > 5) {
        errors.localProductImages =
          "You cannot upload more than 5 images in total";
      }


      const decimalRegex = /^[0-9]+(\.[0-9]+)?$/;

      if (
        values.specification?.size1 &&
        !decimalRegex.test(values.specification.size1)
      ) {
        errors = setIn(errors, "specification.size1", "Invalid Size");
      }

      if (
        values.specification?.size2 &&
        !decimalRegex.test(values.specification.size2)
      ) {
        errors = setIn(errors, "specification.size2", "Invalid Size");
      }

      if (
        !values.specification?.size1
      ) {
        errors = setIn(errors, "specification.size1", "Required");
      }

      if (
        !values.specification?.size2
      ) {
        errors = setIn(errors, "specification.size2", "Required");
      }



      if (values.productTypeId && availableSpecFields) {
        availableSpecFields.forEach((field: any) => {
          if (removedSpecs.includes(field.fieldName)) return;
          const shouldValidate = !values.excludeProductSpec || field.artworkDimensionStatus === true;
          if (!shouldValidate) return;
          const val = values.specification?.[field.fieldName];
          if (field.fieldName === "Width" || field.fieldName === "Height") {
            if (!val?.supplierDescription) {
              errors = setIn(errors, `specification.${field.fieldName}.supplierDescription`, `Required`);
            }
          } else if (["text", "number"].includes(field.fieldType)) {
            if (!val?.supplierDescription) {
              errors = setIn(errors, `specification.${field.fieldName}.supplierDescription`, `Required`);
            }
          } else if (field.fieldType === "select") {
            const sDesc = val?.supplierDescription;
            const isEmpty = !sDesc || (Array.isArray(sDesc) && sDesc.length === 0) || (typeof sDesc === "object" && !Array.isArray(sDesc) && !sDesc.value);
            if (isEmpty) {
              errors = setIn(errors, `specification.${field.fieldName}.supplierDescription`, `Required`);
            }
          }

          // if (field.fieldType === "select" && field.addQuantity === true) {
          //   const sDesc = val?.supplierDescription;

          //   if (Array.isArray(sDesc)) {
          //     sDesc.forEach((item: any, idx: number) => {
          //       const qty = item?.quantity;
          //       console.log("qty",qty)
          //       if (qty === null || qty === undefined || qty === "") {
          //         errors = setIn(
          //           errors,
          //           `specification.${field.fieldName}.supplierDescription.${idx}.quantity`,
          //           "Quantity is required"
          //         );
          //       }

          //       else if (!Number.isInteger(Number(qty)) || Number(qty) < 1) {
          //         errors = setIn(
          //           errors,
          //           `specification.${field.fieldName}.supplierDescription.${idx}.quantity`,
          //           "Quantity must be a positive integer"
          //         );
          //       }
          //     });
          //   }
          // }

        });
      }
      return errors;
    },

    onSubmit: async (formData) => {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("enabled", formData.enabled);
      payload.append("temporaryCode", formData.code);
      payload.append("description", formData.description);
      payload.append("excludeProductSpec", formData.excludeProductSpec);
      payload.append("recordProductHistory", formData.recordProductHistory);
      payload.append("printImage", formData.printImage);
      payload.append("recordStockTransaction", formData.recordStockTransaction);
      payload.append("status", formData.status);
      payload.append("productTypeId", formData.productTypeId?.value ?? formData.productTypeId);
      payload.append("gst", formData.gst);
      // payload.append("relatedProductId", formData.relatedProductId?.value ?? formData.relatedProductId);
      // payload.append("localProductId", formData.localProductId?.value ?? formData.localProductId);

      payload.append(
        "relatedProductId",
        formData.relatedProductId?.value ?? ""
      );

      payload.append(
        "localProductId",
        formData.localProductId?.value ?? ""
      );



      // payload.append("productType", formData.relatedProductType ?? "Related");
      payload.append("specification", JSON.stringify(formData.specification));

      // Test 
      
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
      
      //----------
      
      if (
        formData.relatedImages?.length > 0 &&
        !formData.relatedProductId?.value
      ) {
        productForm.setFieldError(
          "relatedProductId",
          "Please select Related Product before uploading images"
        );
        return;
      }

      if (
        formData.localImages?.length > 0 &&
        !formData.localProductId?.value
      ) {
        productForm.setFieldError(
          "localProductId",
          "Please select Local Product before uploading images"
        );
        return;
      }

      if (formData.image instanceof File) {
        payload.append("image", formData.image);
      } else if (typeof formData.image === "string" && formData.image.length > 0) {
        payload.append("image", formData.image);
      } else {
        payload.append("image", "null");
      }
      const newFiles: File[] = [];
      const existingUrls: string[] = [];

      formData.additionalImages.forEach((item: File | string) => {
        if (item instanceof File) newFiles.push(item);
        else if (typeof item === "string" && item.length > 0) existingUrls.push(item);
      });
      if (newFiles.length > 0) newFiles.forEach((file) => payload.append("additionalImages", file));
      if (existingUrls.length > 0) existingUrls.forEach((url) => payload.append("additionalImageUrls", url));
      else if (newFiles.length === 0) payload.append("clearAdditionalImages", "true");


      const newRelatedFiles: File[] = [];
      const existingRelatedUrls: string[] = [];

      if (Array.isArray(formData.relatedImages)) {
        formData.relatedImages.forEach((item) => {
          if (item instanceof File) {
            newRelatedFiles.push(item);
          } else if (typeof item === "string" && item.length > 0) {
            existingRelatedUrls.push(item);
          }
        });
      }


      // ✅ new uploads
      newRelatedFiles.forEach((file) =>
        payload.append("relatedImages", file)
      );

      if (existingRelatedUrls.length > 0) {
        payload.append(
          "relatedImageUrls",
          JSON.stringify(existingRelatedUrls)
        );
      }




      const newLocalFiles: File[] = [];
      const existingLocalUrls: string[] = [];

      if (Array.isArray(formData.localImages)) {
        formData.localImages.forEach((item) => {
          if (item instanceof File) {
            newLocalFiles.push(item);
          } else if (typeof item === "string" && item.length > 0) {
            existingLocalUrls.push(item);
          }
        });
      }


      // ✅ new uploads
      newLocalFiles.forEach((file) =>
        payload.append("localImages", file)
      );

      if (existingLocalUrls.length > 0) {
        payload.append(
          "localImageUrls",
          JSON.stringify(existingLocalUrls)
        );
      }




      let response;

      id
        ? (response = await modifyData(`/product/${id}`, "put", payload, productForm))
        : (response = await modifyData(`/product`, "post", payload, productForm));

      if (response) {
        setSubmitted(false);
        setRemovedSpecs([]);
        setRelatedProducts([]);  // test
        setLocalProducts([]);    // test
      }
    },
  });

  console.log("prodouctForm", productForm)


  useEffect(() => {
    console.log("FORM ERRORS:", productForm.errors);
  }, [productForm.errors]);


  const products = useMemo(() => {
    const productOptions =
      (productData as any)?.items?.map((product: any) => ({
        label: product?.temporaryCode,
        value: product?.temporaryCode,
      })) || [];

    return productOptions;
  }, [productData]);

  const productss = useMemo(() => {
    const productOptions =
      (productDatas as any)?.items?.map((product: any) => ({
        label: product?.temporaryCode,
        value: product?.temporaryCode,
      })) || [];

    return productOptions;
  }, [productDatas]);

  const { data: productSpecificationTemplateData, fetchData: fetchProductSpecificationTemplate } = useLazyQuery(
    `/product-type/${productForm?.values?.productTypeId?.value ?? productForm?.values?.productTypeId}`,
    "/products"
  );
  const productTemplate: any = productSpecificationTemplateData?.data;

  const availableSpecFields = useMemo(() => {
    if (!productTemplate?.productTypeTemplates) return [];

    if (id && data?.specification) {

      const originalProductTypeId = (data as any)?.productTypeId;
      const currentProductTypeId =
        productForm.values.productTypeId?.value ??
        productForm.values.productTypeId;

      if (originalProductTypeId !== currentProductTypeId) {

        return productTemplate.productTypeTemplates.filter(
          (field: any) => !removedSpecs.includes(field.fieldName)
        );
      } else {

        const existingFieldNames = Object.keys(data.specification);

        return productTemplate.productTypeTemplates.filter(
          (field: any) =>
            existingFieldNames.includes(field.fieldName) &&
            !removedSpecs.includes(field.fieldName)
        );
      }
    } else {

      return productTemplate.productTypeTemplates.filter(
        (field: any) => !removedSpecs.includes(field.fieldName)
      );
    }
  }, [
    productTemplate,
    id,
    data,
    removedSpecs,
    productForm.values.productTypeId,
  ]);


  useEffect(() => {
    if (productTemplate) {
      productForm.validateForm();
      if (id && productForm.values.productTypeId) {
        const originalProductTypeId = (data as any)?.productTypeId;
        const currentProductTypeId =
          productForm.values.productTypeId?.value ??
          productForm.values.productTypeId;

        if (originalProductTypeId !== currentProductTypeId) {
          visitedTabsRef.current = { ...visitedTabsRef.current, 2: true };
        }
      }
    }
  }, [productTemplate, id, data, productForm.values.productTypeId]);

  const getSpecError = (fieldName: string, key: "clientDescription" | "supplierDescription") => {
    const errorMsg = (productForm.errors as any)?.specification?.[fieldName]?.[key];
    const isTouched = (productForm.touched as any)?.specification?.[fieldName]?.[key];
    const isTabVisited = visitedTabsRef.current[2];
    if (errorMsg && (isTouched || isTabVisited || submitted)) return errorMsg;
    return undefined;
  };

  const handleRemoveSpecification = async (fieldName: string) => {

    setRemovedSpecs([...removedSpecs, fieldName]);


    const newSpec = { ...productForm.values.specification };
    delete newSpec[fieldName];
    await productForm.setFieldValue("specification", newSpec);


    const newErrors = { ...productForm.errors };
    if ((newErrors as any)?.specification?.[fieldName]) {
      delete (newErrors as any).specification[fieldName];
    }


    const newTouched = { ...productForm.touched };
    if ((newTouched as any)?.specification?.[fieldName]) {
      delete (newTouched as any).specification[fieldName];
    }


    await productForm.setErrors(newErrors);
    await productForm.setTouched(newTouched);


    setTimeout(() => {
      productForm.validateForm();
    }, 0);
  };

  const handleTabChange = async (event: any, newValue: number) => {
    if (newValue === activeTab) return;
    if (productForm.values.productTypeId === (data as any)?.productTypeId && id && newValue === 0) {
      selectedProductType =
        data && (data as any)?.productTypeId
          ? {
            value: (data as any)?.productType?.id,
            label: (data as any)?.productType?.name,
          }
          : null;
      productForm.setFieldValue("productTypeId", selectedProductType);
    }
    visitedTabsRef.current = { ...visitedTabsRef.current, [activeTab]: true };
    const currentTabFields = tabFields[activeTab];
    const newTouched: any = { ...productForm.touched };
    currentTabFields.forEach((field: any) => {
      if (field === "specification" && activeTab === 2) {
        availableSpecFields?.forEach((specField: any) => {
          newTouched[`specification.${specField.fieldName}.supplierDescription`] = true;
        });
      } else {
        newTouched[field] = true;
      }
    });
    productForm.setTouched(newTouched, true);
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);
  
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
  
  useEffect(() => {
    if (productForm.values.productTypeId) fetchProductSpecificationTemplate();
  }, [productForm.values.productTypeId]);

  useEffect(() => {
    const errorFields = Object.keys(productForm.errors || {});
    const newTabErrors: any = {};

    Object.entries(tabFields).forEach(([tabIndexKey, fields]) => {
      const tabIndex = Number(tabIndexKey);
      let hasError = false;

      if (tabIndex === 2) {
        const templates = availableSpecFields || [];
        hasError = templates.some((field: any) => {
          if (removedSpecs.includes(field.fieldName)) return false;
          const shouldValidate =
            !productForm.values.excludeProductSpec ||
            field.artworkDimensionStatus === true;
          return (
            shouldValidate &&
            !!(productForm.errors as any)?.specification?.[field.fieldName]
              ?.supplierDescription
          );
        });
      } else {
        hasError = (fields as string[]).some((field) =>
          errorFields.includes(field)
        );
      }
      newTabErrors[tabIndex] =
        (visitedTabsRef.current[tabIndex] || submitted) && hasError;
    });

    setTabValidationErrors(newTabErrors);
    if (submitted && !didAutoJumpRef.current) {
      didAutoJumpRef.current = true;

      const firstTabWithError = [0, 1, 2, 3].find((idx) => {
        if (idx === 2) {
          const templates = availableSpecFields || [];
          return templates.some((field: any) => {
            if (removedSpecs.includes(field.fieldName)) return false;
            const shouldValidate =
              !productForm.values.excludeProductSpec ||
              field.artworkDimensionStatus === true;
            return (
              shouldValidate &&
              !!(productForm.errors as any)?.specification?.[field.fieldName]
                ?.supplierDescription
            );
          });
        }
        return (tabFields[idx] as string[]).some((field) =>
          errorFields.includes(field)
        );
      });

      if (firstTabWithError !== undefined && firstTabWithError !== activeTab) {
        setActiveTab(firstTabWithError);
      }
    }
  }, [
    productForm.errors,
    productForm.values.productTypeId,
    productForm.values.excludeProductSpec,
    availableSpecFields,
    submitted,
    activeTab,
  ]);

  let selectedProductType = data && (data as any)?.productTypeId ? { value: (data as any)?.productType?.id, label: (data as any)?.productType?.name } : null;
  const productTypes = (productTypeData as any)?.items?.map((type: any) => ({ label: type?.name, value: type?.id }));
  const statuses = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
  ];

  const relatedProductName = useMemo(() => {
    const code = productForm.values.relatedProductId?.value;
    if (!code) return "";

    const product = (productData as any)?.items?.find(
      (p: any) => p.temporaryCode === code
    );

    return product?.name || "";
  }, [productForm.values.relatedProductId, productData]);

  const localProductName = useMemo(() => {
    const code = productForm.values.localProductId?.value;
    if (!code) return "";

    const product = (productDatas as any)?.items?.find(
      (p: any) => p.temporaryCode === code
    );

    return product?.name || "";
  }, [productForm.values.localProductId, productDatas]);


  return (
    <>
      {(error as any)?.statusCode === 404 ? null : (
        <TitleBar
          title={id ? getLocalStorageData("pageIds")?.[id] ?? (data as any)?.name ?? "" : `Create New Product`}
          headerTitle={id ? getLocalStorageData("pageIds")?.[id] ?? (data as any)?.name ?? "" : `Create New Product`}
          buttonTitle={id ? "Update" : "Create"}
          onClick={async () => {
            visitedTabsRef.current = { 0: true, 1: true, 2: true, 3: true };
            didAutoJumpRef.current = false;
            const allFields = [...tabFields[0], ...tabFields[1], ...tabFields[2], ...tabFields[3]];
            const newTouched: any = {};
            allFields.forEach((f) => (newTouched[f] = true));
            await productForm.setTouched(newTouched, true);
            setSubmitted(true);
            productForm.handleSubmit();
          }}
          disabled={Object.keys(productForm.errors).length !== 0}
          buttonLoading={apiLoading}
        />
      )}
      <Container className="editTableContainer">
        {(error as any)?.statusCode === 404 ? (
          <NoDataFound />
        ) : (
          <FormContainer dirty={productForm.dirty} loading={loading}>
            <Container className="editTableDetailContainer">
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={10.8} mb={2} className="tab-grid">
                  <BorderPanel
                    activeTab={activeTab}
                    subTabs={[
                      { label: "Basic Details", onClick: () => handleTabChange(null, 0), hasError: !!tabValidationErrors?.[0] },
                      { label: "Configuration", onClick: () => handleTabChange(null, 1), hasError: !!tabValidationErrors?.[1] },
                      { label: "Specification", onClick: () => handleTabChange(null, 2), hasError: !!tabValidationErrors?.[2] },
                      { label: "Images & Media", onClick: () => handleTabChange(null, 3), hasError: !!tabValidationErrors?.[3] },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={1.2} className="tab-grid">
                  <ToggleSwitch
                    status={productForm.values.enabled}
                    label="Enable"
                    handleChange={() => productForm.setFieldValue("enabled", !productForm.values.enabled)}
                  />
                </Grid>
              </Grid>

              <ABMTabPanel value={activeTab} index={0}>
                <Grid container alignItems="stretch" columnSpacing={4}>
                  {textFields
                    ?.filter((f) => f.tab === 0)
                    ?.map((field) => (
                      <Grid item xs={4} key={field.id}>
                        <InputTextfield
                          form={productForm}
                          fieldProps={field}
                          generateCode={field.name === "code" ? "P" : null}
                          value={productForm?.values[field.name as keyof typeof productForm.values]}
                        />
                      </Grid>
                    ))}
                  <Grid item xs={4}>
                    <ZSAutocomplete
                      options={productTypes}
                      label="Product Type"
                      placeholder="Select product type"
                      required
                      setValue={async (selectedOption: any) => {
                        if (selectedOption?.value) {
                          const prevSpec = productForm.values.specification || {};
                          const preserved = Object.entries(prevSpec).reduce((acc: any, [key, val]: any) => {
                            if (key === "Width" || key === "Height" || (val as any)?.artworkDimensionStatus === true) acc[key] = val;
                            return acc;
                          }, {});
                          await productForm.setValues({
                            ...productForm.values,
                            productTypeId: selectedOption,
                            specification: preserved,
                            excludeProductSpec: false,
                          });

                          setRemovedSpecs([]);

                        } else {
                          await productForm.setValues({ ...productForm.values, productTypeId: null, specification: null, excludeProductSpec: false });
                        }
                        productForm.setFieldTouched("productTypeId", true);
                        productForm.validateForm();
                      }}
                      defaultValue={productForm.values.productTypeId || selectedProductType}
                      setBlur={() => productForm.setFieldTouched("productTypeId", true)}
                      errorMessage={((productForm.touched as any)?.productTypeId && (productForm.errors as any)?.productTypeId) ?? null}
                      refetchFunction={(s: string) => {
                        if (selectedProductType?.label !== s) setProductTypeSearch(s);
                      }}
                    />
                  </Grid>
                  <Grid item md={8} sm={8} xs={12}>
                    <InputTextfield
                      form={productForm}
                      fieldProps={{
                        id: "description",
                        name: "description",
                        label: "Description",
                        required: true,
                        placeholder: "Enter description",
                        type: "text",
                      }}
                      multiline={true}
                    />
                  </Grid>
                </Grid>
              </ABMTabPanel>

              <ABMTabPanel value={activeTab} index={1}>
                <Grid container alignItems="stretch" columnSpacing={4}>
                  {textFields
                    ?.filter((f) => f.tab === 1)
                    ?.map((field) => (
                      <Grid item xs={4} key={field.id}>
                        <InputTextfield form={productForm} fieldProps={field} />
                      </Grid>
                    ))}
                  <Grid item xs={4}>
                    <ZSSelectBox
                      fieldProps={{ id: "status", name: "status", label: "Status", required: true, placeholder: "Enter status" }}
                      options={statuses}
                      value={productForm.values.status}
                      onChange={(v: any) => productForm.setFieldValue("status", v)}
                      errorMessage={(productForm.touched as any)?.status && (productForm.errors as any)?.status ? (productForm.errors as any)?.status : null}
                    />
                  </Grid>
                  <Grid item md ={6} xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={productForm.values.excludeProductSpec}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const preserved = Object.entries(productForm.values.specification || {}).reduce((acc: any, [key, val]: any) => {
                              if ((key === "Width" || key === "Height") && (val as any)?.artworkDimensionStatus === true) acc[key] = val;
                              return acc;
                            }, {});
                            productForm.setValues({ ...productForm.values, excludeProductSpec: checked, specification: preserved }, true);
                          }}
                        />
                      }
                      label="Exclude product specification"
                    />
                  </Grid>
                  <Grid item md={6} xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={productForm.values.recordProductHistory}
                          onChange={(e) => productForm.setFieldValue("recordProductHistory", e.target.checked)}
                        />
                      }
                      label="Record product history"
                    />
                  </Grid>
                  <Grid item md={6} xs={12}>
                    <FormControlLabel
                      control={<Checkbox checked={productForm.values.printImage} onChange={(e) => productForm.setFieldValue("printImage", e.target.checked)} />}
                      label="Print image"
                    />
                  </Grid>
                  <Grid item md={6} xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={productForm.values.recordStockTransaction}
                          onChange={(e) => productForm.setFieldValue("recordStockTransaction", e.target.checked)}
                        />
                      }
                      label="Record stock transaction"
                    />
                  </Grid>
                </Grid>
              </ABMTabPanel>

              <ABMTabPanel value={activeTab} index={2}>
                {productTemplate?.productTypeTemplates?.some((f: any) => f.artworkDimensionStatus === true) && (
                  <div className="artworkDimensionSection">
                    <Grid item md={6} xs={12}>
                      <Typography fontWeight={800} mb={0.2}>
                        Artwork Dimensions (In Pixels)
                      </Typography>
                    </Grid>
                    <Grid container columnSpacing={4}>
                      <Grid item xs={6}>
                        <InputTextfield
                          form={productForm}
                          fieldProps={{
                            id: "spec-Width",
                            name: `specification.Width.supplierDescription`,
                            label: "Width",
                            type: "number",
                            placeholder: "Enter width",
                            required: true,
                          }}
                          value={productForm.values.specification?.Width?.supplierDescription || ""}
                          error={getSpecError("Width", "supplierDescription")}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <InputTextfield
                          form={productForm}
                          fieldProps={{
                            id: "spec-Height",
                            name: "specification.Height.supplierDescription",
                            label: "Height",
                            type: "number",
                            placeholder: "Enter height",
                            required: true,
                          }}
                          value={productForm.values.specification?.Height?.supplierDescription || ""}
                          error={getSpecError("Height", "supplierDescription")}
                        />
                      </Grid>
                    </Grid>
                  </div>
                )}
                <Grid item md={6} xs={12}>
                  <Typography fontWeight={800} mb={0.5} mt={2}>
                    Product Specification
                  </Typography>

                  <Grid container columnSpacing={4} mt={2}>
                    <Grid item xs={6}>
                      <InputTextfield
                        form={productForm}
                        fieldProps={{
                          id: "size1",
                          name: "specification.size1",
                          label: "Size 1",
                          type: "text",
                          required: false,

                        }}
                        value={productForm.values.specification?.size1}
                        error={(productForm.errors as any)?.specification?.size1}
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <InputTextfield
                        form={productForm}
                        fieldProps={{
                          id: "size2",
                          name: "specification.size2",
                          label: "Size 2",
                          type: "text",
                          required: false,

                        }}
                        value={productForm.values.specification?.size2}
                        error={(productForm.errors as any)?.specification?.size2}
                      />
                    </Grid>
                  </Grid>


                </Grid>
                {productForm.values.excludeProductSpec ? (
                  <Grid item md={6} xs={12}>
                    <p>This product has excluded specifications.</p>
                  </Grid>
                ) : !productForm.values.productTypeId ? (
                  <Grid item md={6} xs={12}>
                    <p>Please select a Product Type to load specifications.</p>
                  </Grid>
                ) : (
                  <>
                    {availableSpecFields
                      ?.filter((f: any) => f.artworkDimensionStatus !== true)
                      ?.map((field: any) => {
                        const specValue = productForm.values.specification?.[field.fieldName] || {};
                        if (field.fieldType === "text" || field.fieldType === "number") {
                          return (
                            <Grid container columnSpacing={4} key={field.id}>
                              <Grid item xs={8}>
                                <InputLabel className="specFieldName">
                                  {field.fieldName}
                                </InputLabel>
                                <Grid container columnSpacing={4}>
                                  <Grid item xs={6}>
                                    <InputTextfield
                                      form={productForm}
                                      fieldProps={{
                                        id: `spec-${field.fieldName}-s`,
                                        name: `specification.${field.fieldName}.supplierDescription`,
                                        label: "Supplier Description",
                                        type: field.fieldType,
                                        placeholder: `Enter ${field.fieldName}`,
                                        required: true,
                                      }}
                                      value={
                                        specValue.supplierDescription || ""
                                      }
                                      error={getSpecError(
                                        field.fieldName,
                                        "supplierDescription"
                                      )}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <InputTextfield
                                      form={productForm}
                                      multiline
                                      minRows={2}
                                      fieldProps={{
                                        id: `spec-${field.fieldName}-c`,
                                        name: `specification.${field.fieldName}.clientDescription`,
                                        label: "Client Description",
                                        type: "text",
                                      }}
                                      value={specValue.clientDescription || ""}
                                    />
                                  </Grid>
                                </Grid>
                              </Grid>
                              <Grid
                                item
                                xs={1}
                                display="flex"
                                justifyContent="center"
                                alignItems="flex-start"
                                mt={3}
                              > <Tooltip title="Remove specification">
                                  <IconButton
                                    onClick={() =>
                                      handleRemoveSpecification(field.fieldName)
                                    }
                                    color="error"
                                    size="small"
                                  >
                                    <DeleteOutline />
                                  </IconButton>
                                </Tooltip>
                              </Grid>
                            </Grid>
                          );
                        }

                        if (field.fieldType === "select") {
                          const multiple = field.multiple === true;
                          const addQuantity = field.addQuantity === true;
                          if (multiple) {
                            const displayVal = Array.isArray(specValue?.supplierDescription)
                              ? specValue.supplierDescription.map((item: any) => (typeof item === "string" ? item : item?.label ?? item?.value))
                              : [];
                            return (
                              <Grid container columnSpacing={4} key={field.id}>
                                <Grid item xs={8}>
                                  <InputLabel className="specFieldName">
                                    {field.fieldName}
                                  </InputLabel>
                                  <Grid container columnSpacing={4}>
                                    <Grid item xs={6} mt={0.4}>
                                      <ZSMultiSelectBox
                                        fieldProps={{
                                          id: `spec-${field.fieldName}-ms`,
                                          name: `specification.${field.fieldName}.supplierDescription`,
                                          label: "Supplier Description",
                                          required: true,
                                        }}
                                        options={field.option.map((o: any) => ({
                                          label: o.supplierDescription,
                                          value: o.supplierDescription,
                                        }))}
                                        value={displayVal}
                                        // onChange={async (val: any[]) => {
                                        //   const selected = (val || []).map(
                                        //     (v: any) => ({
                                        //       label:
                                        //         typeof v === "string"
                                        //           ? v
                                        //           : v.label,
                                        //       value:
                                        //         typeof v === "string"
                                        //           ? v
                                        //           : v.value,
                                        //     })
                                        //   );
                                        //   const clientDesc = selected
                                        //     .map(
                                        //       (opt) =>
                                        //         field.option.find(
                                        //           (o: any) =>
                                        //             o.supplierDescription ===
                                        //             opt.value
                                        //         )?.clientDescription || ""
                                        //     )
                                        //     .filter(Boolean)
                                        //     .join(",");
                                        //   await productForm.setFieldValue(
                                        //     `specification.${field.fieldName}.supplierDescription`,
                                        //     selected,
                                        //     true
                                        //   );
                                        //   productForm.setFieldValue(
                                        //     `specification.${field.fieldName}.clientDescription`,
                                        //     clientDesc
                                        //   );
                                        //   productForm.setFieldTouched(
                                        //     `specification.${field.fieldName}.supplierDescription`,
                                        //     true
                                        //   );
                                        // }}

                                        onChange={async (val: any[]) => {
                                          const prev =
                                            productForm.values.specification?.[field.fieldName]
                                              ?.supplierDescription || [];

                                          const selected = (val || []).map((v: any) => {
                                            const value = typeof v === "string" ? v : v.value;

                                            const existing = prev.find(
                                              (p: any) => p.value === value
                                            );

                                            return {
                                              label: value,
                                              value,
                                              quantity: existing?.quantity ?? 1,
                                            };
                                          });

                                          const clientDesc = selected
                                            .map(
                                              (opt) =>
                                                field.option.find(
                                                  (o: any) => o.supplierDescription === opt.value
                                                )?.clientDescription || ""
                                            )
                                            .filter(Boolean)
                                            .join(",");

                                          await productForm.setFieldValue(
                                            `specification.${field.fieldName}.supplierDescription`,
                                            selected,
                                            true
                                          );

                                          productForm.setFieldValue(
                                            `specification.${field.fieldName}.clientDescription`,
                                            clientDesc
                                          );

                                          productForm.setFieldTouched(
                                            `specification.${field.fieldName}.supplierDescription`,
                                            true
                                          );
                                        }}

                                        errorMessage={getSpecError(
                                          field.fieldName,
                                          "supplierDescription"
                                        )}
                                      />
                                    </Grid>
                                    <Grid item xs={6}>
                                      <InputTextfield
                                        form={productForm}
                                        multiline
                                        minRows={2}
                                        fieldProps={{
                                          id: `spec-${field.fieldName}-mc`,
                                          name: `specification.${field.fieldName}.clientDescription`,
                                          label: "Client Description",
                                          type: "text",
                                        }}
                                        value={
                                          specValue?.clientDescription || ""
                                        }
                                      />
                                    </Grid>

                                    {/* {Array.isArray(specValue?.supplierDescription) && addQuantity &&
                                        specValue.supplierDescription.map((item: any, idx: number) => (
                                          <Grid container spacing={1} key={item.value} mt={1}>


                                            <Grid item xs={6}>
                                              <InputTextfield
                                                form={productForm}
                                                fieldProps={{
                                                  id: `qty-${field.fieldName}-${idx}`,
                                                  name: `specification.${field.fieldName}.supplierDescription.${idx}.quantity`,
                                                  label: `${String(item?.label ?? item?.value ?? "")} – Quantity`,
                                                  type: "number",
                                                  required: true,
                                                }}
                                                value={item.quantity}
                                              />
                                            </Grid>
                                          </Grid>
                                        ))} */}

                                    {Array.isArray(specValue?.supplierDescription) && addQuantity && (
                                      <Grid container spacing={2} mt={1} className="addOptions">
                                        {specValue.supplierDescription.map((item: any, idx: number) => (
                                          <Grid item xs={4} key={item.value ?? idx}>
                                            <InputTextfield
                                              form={productForm}
                                              fieldProps={{
                                                id: `qty-${field.fieldName}-${idx}`,
                                                name: `specification.${field.fieldName}.supplierDescription.${idx}.quantity`,
                                                label: `${String(item?.label ?? item?.value ?? "")} – Quantity`,
                                                type: "number",
                                                required: true,
                                              }}
                                              value={item.quantity}
                                            />
                                          </Grid>
                                        ))}
                                      </Grid>
                                    )}

                                  </Grid>
                                </Grid>


                                <Grid
                                  item
                                  xs={1}
                                  display="flex"
                                  justifyContent="center"
                                  alignItems="flex-start"
                                  mt={3}
                                >
                                  <Tooltip title="Remove specification">
                                    <IconButton
                                      onClick={() =>
                                        handleRemoveSpecification(field.fieldName)
                                      }
                                      color="error"
                                      size="small"
                                    >
                                      <DeleteOutline />
                                    </IconButton>
                                  </Tooltip>
                                </Grid>
                              </Grid>
                            );
                          }
                          const singleDisplay =
                            typeof specValue?.supplierDescription === "string" ? specValue.supplierDescription : specValue?.supplierDescription?.label || "";
                          return (
                            <Grid container columnSpacing={4} key={field.id}>
                              <Grid item xs={8}>
                                <InputLabel className="specFieldName">
                                  {field.fieldName}
                                </InputLabel>
                                <Grid container columnSpacing={4}>
                                  <Grid item xs={6} mt={0.4}>
                                    <ZSSelectBox
                                      fieldProps={{
                                        id: `spec-${field.fieldName}-ss`,
                                        name: `specification.${field.fieldName}.supplierDescription`,
                                        label: "Supplier Description",
                                        required: true,
                                      }}
                                      options={field.option.map((o: any) => ({
                                        label: o.supplierDescription,
                                        value: o.supplierDescription,
                                      }))}
                                      value={singleDisplay}
                                      // onChange={async (val: string) => {
                                      //   const selected = field.option.find(
                                      //     (o: any) =>
                                      //       o.supplierDescription === val
                                      //   );
                                      //   await productForm.setFieldValue(
                                      //     `specification.${field.fieldName}.supplierDescription`,
                                      //     { label: val, value: val },
                                      //     true
                                      //   );
                                      //   productForm.setFieldValue(
                                      //     `specification.${field.fieldName}.clientDescription`,
                                      //     selected?.clientDescription || ""
                                      //   );
                                      //   productForm.setFieldTouched(
                                      //     `specification.${field.fieldName}.supplierDescription`,
                                      //     true
                                      //   );
                                      // }}

                                      onChange={async (val: string) => {
                                        const selected = field.option.find(
                                          (o: any) => o.supplierDescription === val
                                        );

                                        const prev =
                                          productForm.values.specification?.[field.fieldName]
                                            ?.supplierDescription;

                                        await productForm.setFieldValue(
                                          `specification.${field.fieldName}.supplierDescription`,
                                          {
                                            label: val,
                                            value: val,
                                            quantity: prev?.quantity ?? 1,
                                          },
                                          true
                                        );

                                        productForm.setFieldValue(
                                          `specification.${field.fieldName}.clientDescription`,
                                          selected?.clientDescription || ""
                                        );

                                        productForm.setFieldTouched(
                                          `specification.${field.fieldName}.supplierDescription`,
                                          true
                                        );
                                      }}

                                      errorMessage={getSpecError(
                                        field.fieldName,
                                        "supplierDescription"
                                      )}
                                    />

                                    {addQuantity &&
                                      specValue?.supplierDescription?.value && (
                                        <Grid container spacing={1} mt={1}>
                                          <Grid item xs={6}>
                                            <Typography variant="body2">
                                              {specValue.supplierDescription.label}
                                            </Typography>
                                          </Grid>

                                          <Grid item xs={6}>
                                            <InputTextfield
                                              form={productForm}
                                              fieldProps={{
                                                id: `qty-${field.fieldName}`,
                                                name: `specification.${field.fieldName}.supplierDescription.quantity`,
                                                label: "Quantity",
                                                type: "number",
                                                required: true,
                                              }}
                                              value={specValue.supplierDescription.quantity}
                                            />
                                          </Grid>
                                        </Grid>
                                      )}

                                  </Grid>
                                  <Grid item xs={6}>
                                    <InputTextfield
                                      form={productForm}
                                      multiline
                                      minRows={2}
                                      fieldProps={{
                                        id: `spec-${field.fieldName}-sc`,
                                        name: `specification.${field.fieldName}.clientDescription`,
                                        label: "Client Description",
                                        type: "text",
                                      }}
                                      value={specValue?.clientDescription || ""}
                                      disabled
                                    />
                                  </Grid>
                                </Grid>
                              </Grid>
                              <Grid
                                item
                                xs={1}
                                display="flex"
                                justifyContent="center"
                                alignItems="flex-start"
                                mt={3}
                              >
                                <Tooltip title="Remove specification">
                                  <IconButton
                                    onClick={() =>
                                      handleRemoveSpecification(field.fieldName)
                                    }
                                    color="error"
                                    size="small"
                                  >
                                    <DeleteOutline />
                                  </IconButton>
                                </Tooltip>
                              </Grid>
                            </Grid>
                          );
                        }

                        // const addQuantity = field.addQuantity === true;
                        // if(addQuantity){

                        // }

                        return null;
                      })}
                  </>
                )}
              </ABMTabPanel>

              <ABMTabPanel value={activeTab} index={3}>
                    <Grid container alignItems="stretch" columnSpacing={4}>
                        {productForm.errors.additionalImages && (
                        <Grid item md={6} xs={12}>
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

                    {/* RELATED AND LOCAL PRODUCTS SECTION */}
                    <Grid container alignItems="stretch" columnSpacing={4} mt={3} spacing={3}>
                        {/* RELATED PRODUCTS SECTION */}
                        <Grid item md={6} xs={12}>
                         <Grid container>
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
                            <Grid item xs={12} key={relatedProduct.id} sx={{ mt: index > 0 ? 2 : 0 }}>
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
                                <Grid item md={6} xs={12}>
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
                      </Grid>

                    {/* LOCAL PRODUCTS SECTION */}
                    
                      <Grid item md={6} xs={12}>
                        <Grid container>
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
                            <Grid item xs={12} key={localProduct.id} sx={{ mt: index > 0 ? 2 : 0 }}>
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
                                <Grid item md={6} xs={12}>
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
                        </Grid>
                        </Grid>
                    </Grid>

              </ABMTabPanel>

             


              {/* <ABMTabPanel value={activeTab} index={3}> */}

              {/* </ABMTabPanel> */}
            </Container>
          </FormContainer>
        )}
      </Container>
    </>
  );
};

export default Product
