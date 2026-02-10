'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Lang = 'en' | 'zh'

const translations = {
  // Bottom Nav
  'nav.create': { en: 'Create', zh: '创建' },
  'nav.products': { en: 'Products', zh: '产品' },
  'nav.sets': { en: 'Sets', zh: '套组' },
  'nav.settings': { en: 'Settings', zh: '设置' },

  // Create Page
  'create.title': { en: 'Create Product', zh: '创建产品' },
  'create.productSet': { en: 'Product Set', zh: '产品套组' },
  'create.selectSet': { en: 'Select a set...', zh: '选择套组...' },
  'create.nextCode': { en: 'Next Product Code', zh: '下一个产品编号' },
  'create.price': { en: 'Price', zh: '价格' },
  'create.photos': { en: 'Photos', zh: '照片' },
  'create.takePhoto': { en: 'Camera', zh: '拍照' },
  'create.chooseFromAlbum': { en: 'Album', zh: '相册' },
  'create.video': { en: 'Video', zh: '视频' },
  'create.recordVideo': { en: 'Record', zh: '录像' },
  'create.chooseVideo': { en: 'Album', zh: '相册' },
  'create.optional': { en: '(optional)', zh: '（可选）' },
  'create.description': { en: 'Description', zh: '描述' },
  'create.descPlaceholder': { en: 'Enter custom product description...', zh: '输入自定义产品描述...' },
  'create.creating': { en: 'Creating...', zh: '创建中...' },
  'create.status': { en: 'Product Status', zh: '产品状态' },
  'create.statusDraft': { en: 'Draft', zh: '草稿' },
  'create.statusActive': { en: 'Active', zh: '活跃' },
  'create.submit': { en: 'Create Product', zh: '创建产品' },
  'create.selectSetError': { en: 'Please select a product set', zh: '请选择一个产品套组' },
  'create.photoRequired': { en: 'At least one photo is required', zh: '至少需要一张照片' },
  'create.success': { en: 'created successfully!', zh: '创建成功！' },
  'create.failed': { en: 'Failed to create product', zh: '创建产品失败' },
  'create.networkError': { en: 'Network error', zh: '网络错误' },

  // Products Page
  'products.title': { en: 'Products', zh: '产品' },
  'products.search': { en: 'Search by code, set name...', zh: '按编号、套组名搜索...' },
  'products.results': { en: 'result(s)', zh: '条结果' },
  'products.noMatch': { en: 'No products matching', zh: '没有匹配的产品' },
  'products.empty': { en: 'No products yet.', zh: '暂无产品' },
  'products.createFirst': { en: 'Create your first product', zh: '创建第一个产品' },
  'products.edit': { en: 'Edit', zh: '编辑' },
  'products.archive': { en: 'Archive', zh: '归档' },
  'products.archiveConfirm': { en: 'Archive this product?', zh: '归档此产品？' },
  'products.loading': { en: 'Loading products...', zh: '加载产品中...' },

  // Sets Page
  'sets.title': { en: 'Product Sets', zh: '产品套组' },
  'sets.addSet': { en: '+ Add Set', zh: '+ 新增套组' },
  'sets.cancel': { en: 'Cancel', zh: '取消' },
  'sets.namePlaceholder': { en: 'Set name (e.g., Set A)', zh: '套组名称（如：套组A）' },
  'sets.prefixPlaceholder': { en: 'Prefix (e.g., HA)', zh: '前缀（如：HA）' },
  'sets.pricePlaceholder': { en: 'Price', zh: '价格' },
  'sets.originalPricePlaceholder': { en: 'Original Price (optional)', zh: '原价（可选）' },
  'sets.costPlaceholder': { en: 'Cost (optional)', zh: '成本（可选）' },
  'sets.allRequired': { en: 'All fields are required', zh: '所有字段必填' },
  'sets.creating': { en: 'Creating...', zh: '创建中...' },
  'sets.createSet': { en: 'Create Set', zh: '创建套组' },
  'sets.prefix': { en: 'Prefix', zh: '前缀' },
  'sets.prefixWarning': { en: 'Changing prefix will rename all product codes and update Shopify', zh: '更改前缀将重命名所有产品编号并更新Shopify' },
  'sets.savingSyncing': { en: 'Saving & Syncing...', zh: '保存同步中...' },
  'sets.save': { en: 'Save', zh: '保存' },
  'sets.edit': { en: 'Edit', zh: '编辑' },
  'sets.was': { en: 'was', zh: '原价' },
  'sets.margin': { en: 'Margin', zh: '利润' },
  'sets.cost': { en: 'Cost', zh: '成本' },
  'sets.products': { en: 'product(s)', zh: '个产品' },
  'sets.empty': { en: 'No sets yet. Add one to get started.', zh: '暂无套组，添加一个开始吧。' },
  'sets.loading': { en: 'Loading sets...', zh: '加载套组中...' },
  'sets.synced': { en: 'Synced', zh: '已同步' },
  'sets.toShopify': { en: 'product(s) to Shopify', zh: '个产品到Shopify' },
  'sets.errors': { en: 'errors', zh: '个错误' },
  'sets.syncFailed': { en: 'Set saved but Shopify sync failed. Try again later.', zh: '套组已保存，但Shopify同步失败。请稍后重试。' },

  // Settings Page
  'settings.title': { en: 'Settings', zh: '设置' },
  'settings.productDefaults': { en: 'Product Defaults', zh: '产品默认值' },
  'settings.productType': { en: 'Product Type', zh: '产品类型' },
  'settings.selectProductType': { en: 'Select product type', zh: '选择产品类型' },
  'settings.vendor': { en: 'Vendor', zh: '供应商' },
  'settings.selectVendor': { en: 'Select vendor', zh: '选择供应商' },
  'settings.newVendorPlaceholder': { en: 'New vendor name', zh: '新供应商名称' },
  'settings.collection': { en: 'Collection', zh: '系列' },
  'settings.selectCollection': { en: 'Select collection', zh: '选择系列' },
  'settings.newCollectionPlaceholder': { en: 'New collection name', zh: '新系列名称' },
  'settings.metafields': { en: 'Metafields', zh: '元字段' },
  'settings.brands': { en: 'Brands (custom._brands)', zh: '品牌（custom._brands）' },
  'settings.selectBrand': { en: 'Select brand', zh: '选择品牌' },
  'settings.newBrandPlaceholder': { en: 'New brand name', zh: '新品牌名称' },
  'settings.estimatedArrival': { en: 'Estimated Arrival (custom.estimate_arrival)', zh: '预计到货（custom.estimate_arrival）' },
  'settings.selectArrival': { en: 'Select arrival time', zh: '选择到货时间' },
  'settings.cutoff': { en: 'Cutoff Date (custom._cutoff)', zh: '截止日期（custom._cutoff）' },
  'settings.descriptionSection': { en: 'Description', zh: '描述' },
  'settings.universalDesc': { en: 'Universal Product Description', zh: '通用产品描述' },
  'settings.universalDescHint': { en: 'This description will be used for all new products unless overridden.', zh: '此描述将用于所有新产品，除非被覆盖。' },
  'settings.descPlaceholder': { en: 'Enter default product description...', zh: '输入默认产品描述...' },
  'settings.saving': { en: 'Saving...', zh: '保存中...' },
  'settings.saveSettings': { en: 'Save Settings', zh: '保存设置' },
  'settings.noChanges': { en: 'No changes to save', zh: '没有需要保存的更改' },
  'settings.saved': { en: 'Settings saved!', zh: '设置已保存！' },
  'settings.loading': { en: 'Loading settings...', zh: '加载设置中...' },
  'settings.add': { en: 'Add', zh: '添加' },
  'settings.descPhoto': { en: 'Description Photo', zh: '描述图片' },
  'settings.descPhotoHint': { en: 'This photo will be embedded in every product description.', zh: '此图片将嵌入每个产品描述中。' },
  'settings.addPhoto': { en: 'Add Photo', zh: '添加图片' },
  'settings.uploading': { en: 'Uploading...', zh: '上传中...' },
  'settings.removePhoto': { en: 'Remove', zh: '删除' },

  // Inventory
  'inventory.title': { en: 'Inventory', zh: '库存' },
  'inventory.total': { en: 'Total', zh: '总计' },
  'inventory.lowStock': { en: 'Low Stock', zh: '低库存' },
  'inventory.outOfStock': { en: 'Out of Stock', zh: '缺货' },
  'inventory.inStock': { en: 'In Stock', zh: '有货' },
  'inventory.searchPlaceholder': { en: 'Search products...', zh: '搜索产品...' },
  'inventory.allSets': { en: 'All Sets', zh: '所有套组' },
  'inventory.lowStockOnly': { en: 'Low stock only', zh: '仅显示低库存' },
  'inventory.syncSuccess': { en: 'Inventory synced successfully', zh: '库存同步成功' },
  'inventory.syncFailed': { en: 'Inventory sync failed', zh: '库存同步失败' },
  'inventory.syncing': { en: 'Syncing...', zh: '同步中...' },
  'inventory.syncButton': { en: 'Sync Inventory', zh: '同步库存' },
  'inventory.loading': { en: 'Loading inventory...', zh: '加载库存中...' },
  'inventory.noResults': { en: 'No matching products', zh: '没有匹配的产品' },
  'inventory.empty': { en: 'No inventory data', zh: '暂无库存数据' },
} as const

type TranslationKey = keyof typeof translations

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => translations[key]?.zh || key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')

  useEffect(() => {
    const saved = localStorage.getItem('fafa-lang') as Lang | null
    if (saved === 'en' || saved === 'zh') {
      setLangState(saved)
    }
  }, [])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem('fafa-lang', newLang)
  }, [])

  const t = useCallback((key: TranslationKey) => {
    return translations[key]?.[lang] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  return useContext(LanguageContext)
}

export function LanguageToggle() {
  const { lang, setLang } = useT()

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-md bg-white text-gray-600 active:bg-gray-100"
    >
      {lang === 'en' ? '中文' : 'EN'}
    </button>
  )
}
