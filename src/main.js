/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   // purchase — это одна из записей в поле items из чека в data.purchase_records
   // _product — это продукт из коллекции data.products
   const { sale_price, quantity } = purchase;
   const discount = 1 - (purchase.discount / 100);
   return sale_price * quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    if (index === 0) {
        // первый место: 15% от прибыли
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        // второй или третий: 10% от прибыли
        return profit * 0.10;
    } else if (index === total - 1) {
        // последний: бонус 0
        return 0;
    } else { 
        // для всех остальных: 5% от прибыли
        return profit * 0.05;
    }
}



/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data) {
        throw new Error("Data is missing");
    }

    // 2. Проверка продавцов (должен быть непустой массив)
    if (!data.sellers || !Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error("Sellers must be a non-empty array");
    }

    // 3. Проверка продуктов (должен быть непустой массив)
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error("Products must be a non-empty array");
    }

    // 4. Проверка записей о продажах (должен быть непустой массив)
    if (!data.purchase_records || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error("Purchase records must be a non-empty array");
    }

    // 5. Проверка наличия функций для расчёта в options
    if (!options || !options.calculateRevenue || !options.calculateBonus) {
        throw new Error("Calculation functions (calculateRevenue, calculateBonus) are required in options");
    }

    // @TODO: Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
    sellerStats.map(stats => [stats.id, stats])
    ); 

    const productsArray = data.products || []; // защита если products === undefined
    const productIndex = Object.fromEntries(
    productsArray.map(product => [product.sku, product])
    );

    // @TODO: Расчет выручки и прибыли для каждого продавца
    const records = data.purchase_records || [];
    records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return; // пропускаем, если продавца нет в базе
    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach(item => {
        const product = productIndex[item.sku];
        if (!product) return;

        // считаем себестоимость
        const cost = product.purchase_price * item.quantity;
        // считаем выручку 
        const itemRevenue = calculateRevenue(item, product);
        // считаем прибыль
        const itemProfit = itemRevenue - cost;

        // увеличиваем общую накопленную прибыль у продавца
        seller.profit = (seller.profit || 0) + itemProfit;

        // учет количества проданных товаров
        if (!seller.products_sold[item.sku]) {
            seller.products_sold[item.sku] = 0;
        }
        // по артикулу товара увеличиваем его проданное количество у продавца
        seller.products_sold[item.sku] += item.quantity;
    });
});

    
    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => {
        return b.profit - a.profit;
    });

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        // считаем бонус, используя функцию из опций
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        // формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku: sku,
                quantity: quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
    // строка, идентификатор продавца
    seller_id: seller.id,
    
    // строка, имя продавца (у нас уже склеены имя и фамилия)
    name: seller.name,
    
    // число с двумя знаками после точки (выручка)
    revenue: +seller.revenue.toFixed(2),
    
    // число с двумя знаками после точки (прибыль)
    profit: +seller.profit.toFixed(2),
    
    // целое число (количество продаж)
    sales_count: seller.sales_count,
    
    // массив объектов { sku, quantity } (топ-10 товаров)
    top_products: seller.top_products,
    
    // число с двумя знаками после точки (бонус)
    bonus: +seller.bonus.toFixed(2)
}));
}
