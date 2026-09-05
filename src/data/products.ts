// src/data/products.ts

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  isActive: boolean;
  description?: string;
}

export const products: Product[] = [
  // ПИВО / BEER
  { id: 'beer-1', name: 'Heineken', price: 35000, category: 'beer', image: '/products/beer/beer1.jpg', stock: 50, isActive: true },
  { id: 'beer-2', name: 'Corona', price: 40000, category: 'beer', image: '/products/beer/beer2.jpg', stock: 45, isActive: true },
  { id: 'beer-3', name: 'Guinness', price: 45000, category: 'beer', image: '/products/beer/beer3.jpg', stock: 30, isActive: true },
  { id: 'beer-4', name: 'Бочкаревское', price: 25000, category: 'beer', image: '/products/beer/beer4.jpg', stock: 60, isActive: true },

  // ХЛЕБ / BREAD
  { id: 'bread-1', name: 'Хлеб ржаной', price: 15000, category: 'bread', image: '/products/bread/bread1.jpg', stock: 100, isActive: true },
  { id: 'bread-2', name: 'Хлеб пшеничный', price: 12000, category: 'bread', image: '/products/bread/bread2.jpg', stock: 120, isActive: true },
  { id: 'bread-3', name: 'Чёрный хлеб', price: 18000, category: 'bread', image: '/products/bread/bread3.jpg', stock: 80, isActive: true },
  { id: 'bread-4', name: 'Белый хлеб', price: 10000, category: 'bread', image: '/products/bread/bread4.jpg', stock: 150, isActive: true },

  // КУРИЦА / CHICKEN
  { id: 'chicken-1', name: 'Курица гриль', price: 85000, category: 'chicken', image: '/products/chicken/chicken1.jpg', stock: 20, isActive: true },
  { id: 'chicken-2', name: 'Куриные крылья', price: 65000, category: 'chicken', image: '/products/chicken/chicken2.jpg', stock: 25, isActive: true },
  { id: 'chicken-3', name: 'Куриное филе', price: 75000, category: 'chicken', image: '/products/chicken/chicken3.jpg', stock: 30, isActive: true },
  { id: 'chicken-4', name: 'Куриная ножка', price: 55000, category: 'chicken', image: '/products/chicken/chicken4.jpg', stock: 35, isActive: true },

  // КОНЬЯК / COGNAC
  { id: 'cognac-1', name: 'Hennessy VS', price: 350000, category: 'cognac', image: '/products/cognac/cognac1.jpg', stock: 10, isActive: true },
  { id: 'cognac-2', name: 'Martell VSOP', price: 320000, category: 'cognac', image: '/products/cognac/cognac2.jpg', stock: 8, isActive: true },
  { id: 'cognac-3', name: 'Remy Martin XO', price: 420000, category: 'cognac', image: '/products/cognac/cognac3.jpg', stock: 5, isActive: true },
  { id: 'cognac-4', name: 'Courvoisier', price: 280000, category: 'cognac', image: '/products/cognac/cognac4.jpg', stock: 12, isActive: true },
  { id: 'cognac-5', name: 'Napoleon', price: 290000, category: 'cognac', image: '/products/cognac/cognac5.jpg', stock: 7, isActive: true },
  { id: 'cognac-6', name: 'Otard', price: 270000, category: 'cognac', image: '/products/cognac/cognac6.png', stock: 9, isActive: true },

  // ХОЛОДНЫЕ ЗАКУСКИ / COLD SNACKS
  { id: 'cold-snack-1', name: 'Салат с семгой', price: 125000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack1.jpg', stock: 15, isActive: true },
  { id: 'cold-snack-2', name: 'Крабовое ассорти', price: 95000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack2.jpg', stock: 12, isActive: true },
  { id: 'cold-snack-3', name: 'Шпроты в масле', price: 45000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack3.jpg', stock: 30, isActive: true },
  { id: 'cold-snack-4', name: 'Сыр с колбасой', price: 75000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack4.jpg', stock: 20, isActive: true },
  { id: 'cold-snack-5', name: 'Селедка под шубой', price: 85000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack5.jpg', stock: 10, isActive: true },
  { id: 'cold-snack-6', name: 'Морепродукты', price: 145000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack6.jpg', stock: 8, isActive: true },
  { id: 'cold-snack-7', name: 'Паштет из печени', price: 65000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack7.jpg', stock: 16, isActive: true },
  { id: 'cold-snack-8', name: 'Копченая грудка', price: 105000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack8.jpg', stock: 12, isActive: true },
  { id: 'cold-snack-9', name: 'Оливье', price: 55000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack9.jpg', stock: 25, isActive: true },
  { id: 'cold-snack-10', name: 'Винегрет', price: 48000, category: 'cold-snacks', image: '/products/cold-snacks/coldSnack10.jpg', stock: 20, isActive: true },

  // ХОЛОДНЫЕ СУПЫ / COLD SOUPS
  { id: 'cold-soup-1', name: 'Окрошка', price: 35000, category: 'cold-soups', image: '/products/cold-soups/coldSoup1.jpg', stock: 40, isActive: true },
  { id: 'cold-soup-2', name: 'Гаспачо', price: 42000, category: 'cold-soups', image: '/products/cold-soups/coldSoup2.jpg', stock: 30, isActive: true },
  { id: 'cold-soup-3', name: 'Крем-суп холодный', price: 38000, category: 'cold-soups', image: '/products/cold-soups/coldSoup3.jpg', stock: 25, isActive: true },

  // ДЕСЕРТЫ / DESSERTS
  { id: 'dessert-1', name: 'Тирамису', price: 65000, category: 'desserts', image: '/products/desserts/dessert1.jpg', stock: 15, isActive: true },
  { id: 'dessert-2', name: 'Панна-котта', price: 58000, category: 'desserts', image: '/products/desserts/dessert2.jpg', stock: 12, isActive: true },
  { id: 'dessert-3', name: 'Чизкейк', price: 72000, category: 'desserts', image: '/products/desserts/dessert3.jpg', stock: 10, isActive: true },
  { id: 'dessert-4', name: 'Шоколадный мусс', price: 52000, category: 'desserts', image: '/products/desserts/dessert4.jpg', stock: 18, isActive: true },
  { id: 'dessert-5', name: 'Мороженое', price: 35000, category: 'desserts', image: '/products/desserts/dessert5.jpg', stock: 50, isActive: true },

  // НАПИТКИ / DRINKS
  { id: 'drink-1', name: 'Кола', price: 15000, category: 'drinks', image: '/products/drinks/drink1.jpg', stock: 150, isActive: true },
  { id: 'drink-2', name: 'Спрайт', price: 15000, category: 'drinks', image: '/products/drinks/drink2.jpg', stock: 140, isActive: true },
  { id: 'drink-3', name: 'Апельсиновый сок', price: 25000, category: 'drinks', image: '/products/drinks/drink3.jpg', stock: 80, isActive: true },
  { id: 'drink-4', name: 'Томатный сок', price: 20000, category: 'drinks', image: '/products/drinks/drink4.jpg', stock: 60, isActive: true },
  { id: 'drink-5', name: 'Лимонад', price: 22000, category: 'drinks', image: '/products/drinks/drink5.jpg', stock: 100, isActive: true },
  { id: 'drink-6', name: 'Компот', price: 18000, category: 'drinks', image: '/products/drinks/drink6.jpg', stock: 90, isActive: true },
  { id: 'drink-7', name: 'Ягодный морс', price: 28000, category: 'drinks', image: '/products/drinks/drink7.jpg', stock: 50, isActive: true },
  { id: 'drink-8', name: 'Цветочный чай', price: 32000, category: 'drinks', image: '/products/drinks/drink8.jpg', stock: 45, isActive: true },
  { id: 'drink-9', name: 'Зеленый чай', price: 28000, category: 'drinks', image: '/products/drinks/drink9.jpg', stock: 55, isActive: true },
  { id: 'drink-10', name: 'Черный чай', price: 25000, category: 'drinks', image: '/products/drinks/drink10.jpg', stock: 70, isActive: true },

  // ГАРНИРЫ / GARNISHES
  { id: 'garnish-1', name: 'Картофель фри', price: 28000, category: 'garnishes', image: '/products/garnishes/garnish1.jpg', stock: 100, isActive: true },
  { id: 'garnish-2', name: 'Рис с овощами', price: 32000, category: 'garnishes', image: '/products/garnishes/garnish2.jpg', stock: 80, isActive: true },
  { id: 'garnish-3', name: 'Макаронные изделия', price: 25000, category: 'garnishes', image: '/products/garnishes/garnish3.jpg', stock: 90, isActive: true },

  // ГОРЯЧИЕ ЗАКУСКИ / HOT SNACKS
  { id: 'hot-snack-1', name: 'Крокеты', price: 48000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack1.jpg', stock: 30, isActive: true },
  { id: 'hot-snack-2', name: 'Спринг-роллы', price: 52000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack2.jpg', stock: 25, isActive: true },
  { id: 'hot-snack-3', name: 'Сырные палочки', price: 42000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack3.jpg', stock: 40, isActive: true },
  { id: 'hot-snack-4', name: 'Луковые кольца', price: 38000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack4.jpg', stock: 50, isActive: true },
  { id: 'hot-snack-5', name: 'Крылья буффало', price: 62000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack5.jpg', stock: 35, isActive: true },
  { id: 'hot-snack-6', name: 'Блюдо из морепродуктов', price: 78000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack6.jpg', stock: 20, isActive: true },
  { id: 'hot-snack-7', name: 'Пельмени на пару', price: 55000, category: 'hot-snacks', image: '/products/hot-snacks/hotSnack7.jpg', stock: 45, isActive: true },

  // ГОРЯЧИЕ СУПЫ / HOT SOUPS
  { id: 'hot-soup-1', name: 'Борщ украинский', price: 42000, category: 'hot-soups', image: '/products/hot-soups/hotSoup1.jpg', stock: 35, isActive: true },
  { id: 'hot-soup-2', name: 'Щи капустные', price: 38000, category: 'hot-soups', image: '/products/hot-soups/hotSoup2.jpg', stock: 40, isActive: true },
  { id: 'hot-soup-3', name: 'Солянка', price: 52000, category: 'hot-soups', image: '/products/hot-soups/hotSoup3.jpg', stock: 25, isActive: true },
  { id: 'hot-soup-4', name: 'Уха', price: 58000, category: 'hot-soups', image: '/products/hot-soups/hotSoup4.jpg', stock: 20, isActive: true },
  { id: 'hot-soup-5', name: 'Крем-суп грибной', price: 48000, category: 'hot-soups', image: '/products/hot-soups/hotSoup5.jpg', stock: 30, isActive: true },
  { id: 'hot-soup-6', name: 'Куриный суп', price: 38000, category: 'hot-soups', image: '/products/hot-soups/hotSoup6.jpg', stock: 50, isActive: true },
  { id: 'hot-soup-7', name: 'Мясной суп', price: 52000, category: 'hot-soups', image: '/products/hot-soups/hotSoup7.jpg', stock: 28, isActive: true },
  { id: 'hot-soup-8', name: 'Рыбный суп', price: 62000, category: 'hot-soups', image: '/products/hot-soups/hotSoup8.jpg', stock: 18, isActive: true },
  { id: 'hot-soup-9', name: 'Овощной суп', price: 35000, category: 'hot-soups', image: '/products/hot-soups/hotSoup9.jpg', stock: 45, isActive: true },
  { id: 'hot-soup-10', name: 'Лапша куриная', price: 42000, category: 'hot-soups', image: '/products/hot-soups/hotSoup10.jpg', stock: 40, isActive: true },

  // ОСНОВНЫЕ БЛЮДА / MAIN COURSES
  { id: 'main-1', name: 'Стейк говяжий', price: 185000, category: 'main-courses', image: '/products/main-courses/mainCourse1.jpg', stock: 10, isActive: true },
  { id: 'main-2', name: 'Филе лосося', price: 175000, category: 'main-courses', image: '/products/main-courses/mainCourse2.jpg', stock: 12, isActive: true },
  { id: 'main-3', name: 'Люля-кебаб', price: 95000, category: 'main-courses', image: '/products/main-courses/mainCourse3.jpg', stock: 20, isActive: true },
  { id: 'main-4', name: 'Ризотто', price: 85000, category: 'main-courses', image: '/products/main-courses/mainCourse4.jpg', stock: 15, isActive: true },
  { id: 'main-5', name: 'Паста Болоньезе', price: 72000, category: 'main-courses', image: '/products/main-courses/mainCourse5.jpg', stock: 25, isActive: true },
  { id: 'main-6', name: 'Пицца Маргарита', price: 65000, category: 'main-courses', image: '/products/main-courses/mainCourse6.jpg', stock: 30, isActive: true },
  { id: 'main-7', name: 'Пицца Четыре сыра', price: 78000, category: 'main-courses', image: '/products/main-courses/mainCourse7.jpg', stock: 25, isActive: true },
  { id: 'main-8', name: 'Паста Карбонара', price: 68000, category: 'main-courses', image: '/products/main-courses/mainCourse8.jpg', stock: 20, isActive: true },
  { id: 'main-9', name: 'Рыба на гриле', price: 125000, category: 'main-courses', image: '/products/main-courses/mainCourse9.jpg', stock: 12, isActive: true },
  { id: 'main-10', name: 'Утка с апельсином', price: 145000, category: 'main-courses', image: '/products/main-courses/mainCourse10.jpg', stock: 8, isActive: true },
  { id: 'main-11', name: 'Бефстроганов', price: 135000, category: 'main-courses', image: '/products/main-courses/mainCourse11.jpg', stock: 10, isActive: true },
  { id: 'main-12', name: 'Плов узбекский', price: 72000, category: 'main-courses', image: '/products/main-courses/mainCourse12.jpg', stock: 30, isActive: true },
  { id: 'main-13', name: 'Лобстер', price: 220000, category: 'main-courses', image: '/products/main-courses/mainCourse13.jpg', stock: 5, isActive: true },
  { id: 'main-14', name: 'Медальоны говядины', price: 165000, category: 'main-courses', image: '/products/main-courses/mainCourse14.jpg', stock: 8, isActive: true },
  { id: 'main-15', name: 'Креветки на гриле', price: 145000, category: 'main-courses', image: '/products/main-courses/mainCourse15.jpg', stock: 10, isActive: true },
  { id: 'main-16', name: 'Мидии в белом вине', price: 125000, category: 'main-courses', image: '/products/main-courses/mainCourse16.jpg', stock: 12, isActive: true },
  { id: 'main-17', name: 'Семга на подушке', price: 165000, category: 'main-courses', image: '/products/main-courses/mainCourse17.jpg', stock: 9, isActive: true },
  { id: 'main-18', name: 'Гусь запеченный', price: 185000, category: 'main-courses', image: '/products/main-courses/mainCourse18.jpg', stock: 6, isActive: true },
  { id: 'main-19', name: 'Стейк лосося', price: 155000, category: 'main-courses', image: '/products/main-courses/mainCourse19.jpg', stock: 11, isActive: true },

  // МЯСНЫЕ ЗАКУСКИ / MEAT SNACKS
  { id: 'meat-snack-1', name: 'Колбаски копченые', price: 65000, category: 'meat-snacks', image: '/products/meat-snacks/meatSnack1.jpg', stock: 25, isActive: true },
  { id: 'meat-snack-2', name: 'Ветчина домашняя', price: 85000, category: 'meat-snacks', image: '/products/meat-snacks/meatSnack2.jpg', stock: 15, isActive: true },
  { id: 'meat-snack-3', name: 'Мясное ассорти', price: 125000, category: 'meat-snacks', image: '/products/meat-snacks/meatSnack3.jpg', stock: 10, isActive: true },

  // МОХИТО / MOJITO
  { id: 'mojito-1', name: 'Классический мохито', price: 45000, category: 'mojito', image: '/products/mojito/mojito1.jpg', stock: 50, isActive: true },
  { id: 'mojito-2', name: 'Мохито с клубникой', price: 48000, category: 'mojito', image: '/products/mojito/mojito2.jpg', stock: 45, isActive: true },
  { id: 'mojito-3', name: 'Мохито с малиной', price: 48000, category: 'mojito', image: '/products/mojito/mojito3.jpg', stock: 40, isActive: true },
  { id: 'mojito-4', name: 'Мохито с манго', price: 52000, category: 'mojito', image: '/products/mojito/mojito4.jpg', stock: 35, isActive: true },
  { id: 'mojito-5', name: 'Мохито с ежевикой', price: 48000, category: 'mojito', image: '/products/mojito/mojito5.jpg', stock: 38, isActive: true },
  { id: 'mojito-6', name: 'Вирджинский мохито', price: 40000, category: 'mojito', image: '/products/mojito/mojito6.jpg', stock: 55, isActive: true },
  { id: 'mojito-7', name: 'Мохито с ананасом', price: 52000, category: 'mojito', image: '/products/mojito/mojito7.jpg', stock: 42, isActive: true },
  { id: 'mojito-8', name: 'Мохито с лимоном', price: 42000, category: 'mojito', image: '/products/mojito/mojito8.jpg', stock: 48, isActive: true },

  // САЛАТЫ / SALADS
  { id: 'salad-1', name: 'Цезарь с курицей', price: 75000, category: 'salads', image: '/products/salads/salad1.jpg', stock: 20, isActive: true },
  { id: 'salad-2', name: 'Греческий салат', price: 68000, category: 'salads', image: '/products/salads/salad2.jpg', stock: 25, isActive: true },
  { id: 'salad-3', name: 'Салат Нисуаз', price: 85000, category: 'salads', image: '/products/salads/salad3.jpg', stock: 15, isActive: true },
  { id: 'salad-4', name: 'Капрезе', price: 72000, category: 'salads', image: '/products/salads/salad4.jpg', stock: 18, isActive: true },
  { id: 'salad-5', name: 'Салат с беконом', price: 78000, category: 'salads', image: '/products/salads/salad5.jpg', stock: 16, isActive: true },
  { id: 'salad-6', name: 'Шопский салат', price: 62000, category: 'salads', image: '/products/salads/salad6.jpg', stock: 22, isActive: true },
  { id: 'salad-7', name: 'Салат из свеклы', price: 58000, category: 'salads', image: '/products/salads/salad7.jpg', stock: 28, isActive: true },
  { id: 'salad-8', name: 'Салат из морепродуктов', price: 95000, category: 'salads', image: '/products/salads/salad8.jpg', stock: 12, isActive: true },
  { id: 'salad-9', name: 'Садовый микс', price: 52000, category: 'salads', image: '/products/salads/salad9.jpg', stock: 30, isActive: true },
  { id: 'salad-10', name: 'Капустный салат', price: 42000, category: 'salads', image: '/products/salads/salad10.jpg', stock: 35, isActive: true },
  { id: 'salad-11', name: 'Салат из рукколы', price: 68000, category: 'salads', image: '/products/salads/salad11.jpg', stock: 20, isActive: true },
  { id: 'salad-12', name: 'Цезарь с лососем', price: 98000, category: 'salads', image: '/products/salads/salad12.jpg', stock: 10, isActive: true },
  { id: 'salad-13', name: 'Салат с авокадо', price: 85000, category: 'salads', image: '/products/salads/salad13.jpg', stock: 14, isActive: true },
  { id: 'salad-14', name: 'Салат из помидоров', price: 48000, category: 'salads', image: '/products/salads/salad14.jpg', stock: 40, isActive: true },
  { id: 'salad-15', name: 'Салат с козьим сыром', price: 88000, category: 'salads', image: '/products/salads/salad15.jpg', stock: 12, isActive: true },
  { id: 'salad-16', name: 'Микс зелени', price: 55000, category: 'salads', image: '/products/salads/salad16.jpg', stock: 32, isActive: true },
  { id: 'salad-17', name: 'Теплый салат', price: 72000, category: 'salads', image: '/products/salads/salad17.jpg', stock: 16, isActive: true },
  { id: 'salad-18', name: 'Салат с кальмарами', price: 92000, category: 'salads', image: '/products/salads/salad18.jpg', stock: 11, isActive: true },
  { id: 'salad-19', name: 'Салат с сыром Фета', price: 72000, category: 'salads', image: '/products/salads/salad19.jpg', stock: 19, isActive: true },
  { id: 'salad-20', name: 'Салат из помело', price: 82000, category: 'salads', image: '/products/salads/salad20.jpg', stock: 13, isActive: true },
  { id: 'salad-21', name: 'Салат с кукурузой', price: 58000, category: 'salads', image: '/products/salads/salad21.jpg', stock: 26, isActive: true },
  { id: 'salad-22', name: 'Японский салат', price: 95000, category: 'salads', image: '/products/salads/salad22.jpg', stock: 9, isActive: true },

  // МОРСКИЕ САЛАТЫ / SEAFOOD SALADS
  { id: 'seafood-salad-1', name: 'Салат с крабом', price: 105000, category: 'seafood-salads', image: '/products/seafood-salads/seafoodSalad1.jpg', stock: 10, isActive: true },
  { id: 'seafood-salad-2', name: 'Салат с креветками', price: 110000, category: 'seafood-salads', image: '/products/seafood-salads/seafoodSalad2.jpg', stock: 9, isActive: true },
  { id: 'seafood-salad-3', name: 'Салат с мидиями', price: 115000, category: 'seafood-salads', image: '/products/seafood-salads/seafoodSalad3.jpg', stock: 8, isActive: true },
  { id: 'seafood-salad-4', name: 'Салат с кальмарами и креветками', price: 125000, category: 'seafood-salads', image: '/products/seafood-salads/seafoodSalad4.jpg', stock: 7, isActive: true },
  { id: 'seafood-salad-5', name: 'Летний морской салат', price: 118000, category: 'seafood-salads', image: '/products/seafood-salads/seafoodSalad5.jpg', stock: 8, isActive: true },

  // ШАШЛЫК / SHASHLIK
  { id: 'shashlik-1', name: 'Шашлык из свинины', price: 95000, category: 'shashlik', image: '/products/shashlik/shashlik1.jpg', stock: 15, isActive: true },
  { id: 'shashlik-2', name: 'Шашлык из говядины', price: 105000, category: 'shashlik', image: '/products/shashlik/shashlik2.jpg', stock: 12, isActive: true },
  { id: 'shashlik-3', name: 'Шашлык из курицы', price: 78000, category: 'shashlik', image: '/products/shashlik/shashlik3.jpg', stock: 20, isActive: true },
  { id: 'shashlik-4', name: 'Шашлык из ягненка', price: 115000, category: 'shashlik', image: '/products/shashlik/shashlik4.jpg', stock: 10, isActive: true },
  { id: 'shashlik-5', name: 'Шашлык из рыбы', price: 98000, category: 'shashlik', image: '/products/shashlik/shashlik5.jpg', stock: 11, isActive: true },
  { id: 'shashlik-6', name: 'Шашлык из морепродуктов', price: 125000, category: 'shashlik', image: '/products/shashlik/shashlik6.jpg', stock: 8, isActive: true },
  { id: 'shashlik-7', name: 'Люля-шашлык', price: 88000, category: 'shashlik', image: '/products/shashlik/shashlik7.jpg', stock: 14, isActive: true },
  { id: 'shashlik-8', name: 'Овощной шашлык', price: 65000, category: 'shashlik', image: '/products/shashlik/shashlik8.jpg', stock: 25, isActive: true },
  { id: 'shashlik-9', name: 'Микс шашлык', price: 128000, category: 'shashlik', image: '/products/shashlik/shashlik9.png', stock: 6, isActive: true },

  // ОВОЩНЫЕ САЛАТЫ / VEGETABLE SALADS
  { id: 'veg-salad-1', name: 'Салат "Мопс"', price: 52000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad1.jpg', stock: 20, isActive: true },
  { id: 'veg-salad-2', name: 'Салат "Подсолнух"', price: 65000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad2.jpg', stock: 16, isActive: true },
  { id: 'veg-salad-3', name: 'Салат "Снег"', price: 58000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad3.jpg', stock: 18, isActive: true },
  { id: 'veg-salad-4', name: 'Салат "Слоеный"', price: 72000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad4.jpg', stock: 14, isActive: true },
  { id: 'veg-salad-5', name: 'Салат "Красавица"', price: 68000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad5.jpg', stock: 15, isActive: true },
  { id: 'veg-salad-6', name: 'Салат "Осень"', price: 62000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad6.jpg', stock: 19, isActive: true },
  { id: 'veg-salad-7', name: 'Салат "Весна"', price: 55000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad7.jpg', stock: 25, isActive: true },
  { id: 'veg-salad-8', name: 'Салат "Звезда"', price: 75000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad8.jpg', stock: 12, isActive: true },
  { id: 'veg-salad-9', name: 'Салат "Радуга"', price: 68000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad9.jpg', stock: 17, isActive: true },
  { id: 'veg-salad-10', name: 'Салат "Вулкан"', price: 72000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad10.jpg', stock: 13, isActive: true },
  { id: 'veg-salad-11', name: 'Салат "Букет"', price: 68000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad11.jpg', stock: 16, isActive: true },
  { id: 'veg-salad-12', name: 'Салат "Плетень"', price: 65000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad12.jpg', stock: 18, isActive: true },
  { id: 'veg-salad-13', name: 'Салат "Комета"', price: 70000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad13.jpg', stock: 14, isActive: true },
  { id: 'veg-salad-14', name: 'Салат "Аврора"', price: 68000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad14.jpg', stock: 15, isActive: true },
  { id: 'veg-salad-15', name: 'Салат "Лилия"', price: 72000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad15.jpg', stock: 12, isActive: true },
  { id: 'veg-salad-16', name: 'Салат "Нарцисс"', price: 65000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad16.jpg', stock: 19, isActive: true },
  { id: 'veg-salad-17', name: 'Салат "Роза"', price: 68000, category: 'vegetable-salads', image: '/products/vegetable-salads/vegetableSalad17.jpg', stock: 16, isActive: true },

  // ВОДКА / VODKA
  { id: 'vodka-1', name: 'Smirnoff', price: 145000, category: 'vodka', image: '/products/vodka/vodka1.jpg', stock: 15, isActive: true },
  { id: 'vodka-2', name: 'Grey Goose', price: 185000, category: 'vodka', image: '/products/vodka/vodka2.jpg', stock: 12, isActive: true },
  { id: 'vodka-3', name: 'Belvedere', price: 175000, category: 'vodka', image: '/products/vodka/vodka3.jpg', stock: 10, isActive: true },
  { id: 'vodka-4', name: 'Ciroc', price: 195000, category: 'vodka', image: '/products/vodka/vodka4.jpg', stock: 8, isActive: true },
  { id: 'vodka-5', name: 'Ketel One', price: 165000, category: 'vodka', image: '/products/vodka/vodka5.jpg', stock: 14, isActive: true },
  { id: 'vodka-6', name: 'Tito\'s', price: 155000, category: 'vodka', image: '/products/vodka/vodka6.jpg', stock: 16, isActive: true },
  { id: 'vodka-7', name: 'Stolichnaya', price: 135000, category: 'vodka', image: '/products/vodka/vodka7.jpg', stock: 18, isActive: true },
  { id: 'vodka-8', name: 'Finlandia', price: 128000, category: 'vodka', image: '/products/vodka/vodka8.jpg', stock: 20, isActive: true },
  { id: 'vodka-9', name: 'Absolut', price: 148000, category: 'vodka', image: '/products/vodka/vodka9.jpg', stock: 17, isActive: true },
  { id: 'vodka-10', name: 'Zubrowka', price: 142000, category: 'vodka', image: '/products/vodka/vodka10.jpg', stock: 13, isActive: true },

  // ВИНО / WINE
  { id: 'wine-1', name: 'Красное Мерло', price: 235000, category: 'wine', image: '/products/wine/wine1.jpg', stock: 8, isActive: true },
  { id: 'wine-2', name: 'Белое Шардоне', price: 225000, category: 'wine', image: '/products/wine/wine2.jpg', stock: 10, isActive: true },
  { id: 'wine-3', name: 'Розовое Прованс', price: 195000, category: 'wine', image: '/products/wine/wine3.jpg', stock: 12, isActive: true },
  { id: 'wine-4', name: 'Шампанское', price: 285000, category: 'wine', image: '/products/wine/wine4.jpg', stock: 6, isActive: true },
];

export const categories = [
  { id: 'beer', name: 'Пиво', image: '/images/categories/beer.jpg' },
  { id: 'bread', name: 'Хлеб', image: '/images/categories/bread.jpg' },
  { id: 'chicken', name: 'Курица', image: '/images/categories/chicken.jpg' },
  { id: 'cognac', name: 'Коньяк', image: '/images/categories/cognac.jpg' },
  { id: 'cold-snacks', name: 'Холодные закуски', image: '/images/categories/cold-appetizers.jpg' },
  { id: 'cold-soups', name: 'Холодные супы', image: '/images/categories/cold-soups.jpg' },
  { id: 'desserts', name: 'Десерты', image: '/images/categories/desserts.jpg' },
  { id: 'drinks', name: 'Напитки', image: '/images/categories/drinks.jpg' },
  { id: 'garnishes', name: 'Гарниры', image: '/images/categories/side-dishes.jpg' },
  { id: 'hot-snacks', name: 'Горячие закуски', image: '/images/categories/hot-appetizers.jpg' },
  { id: 'hot-soups', name: 'Горячие супы', image: '/images/categories/hot-soups.jpg' },
  { id: 'main-courses', name: 'Основные блюда', image: '/images/categories/main-dishes.jpg' },
  { id: 'meat-snacks', name: 'Мясные закуски', image: '/images/categories/meat-appetizers.jpg' },
  { id: 'mojito', name: 'Мохито', image: '/images/categories/mojito.jpg' },
  { id: 'salads', name: 'Салаты', image: '/images/categories/salads.jpg' },
  { id: 'seafood-salads', name: 'Морские салаты', image: '/images/categories/seafood-salads.jpg' },
  { id: 'shashlik', name: 'Шашлык', image: '/images/categories/shashlik.jpg' },
  { id: 'vegetable-salads', name: 'Овощные салаты', image: '/images/categories/vegetable-salads.jpg' },
  { id: 'vodka', name: 'Водка', image: '/images/categories/vodka.jpg' },
  { id: 'wine', name: 'Вино', image: '/images/categories/wine.jpg' },
];
