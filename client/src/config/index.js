export const registerFormControls = [
  {
    name: "userName",
    label: "User Name",
    placeholder: "Enter your user name",
    componentType: "input",
    type: "text",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Enter your email",
    componentType: "input",
    type: "text",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    placeholder: "Enter your password",
    componentType: "input",
    type: "password",
    required: true,
    helperText:
      "Minimum 8 characters with at least one special character (e.g., !@#$%^&*).",
  },
];

export const loginFormControls = [
  {
    name: "email",
    label: "Email",
    placeholder: "Enter your email",
    componentType: "input",
    type: "text",
  },
  {
    name: "password",
    label: "Password",
    placeholder: "Enter your password",
    componentType: "input",
    type: "password",
  },
];

export const addProductFormElements = [
  {
    label: "Category",
    name: "category",
    componentType: "select",
    options: [
      { id: "pe-uniform", label: "P.E Uniform" },
      { id: "souvenirs", label: "Souvenirs" },
      { id: "books", label: "Books" },
      { id: "clothing", label: "Clothing" },
      { id: "accessories", label: "Accessories" },
    ],
  },
  {
    label: "Product Name",
    name: "title",
    componentType: "input",
    type: "text",
    placeholder: "Enter product name",
  },
  {
    label: "Description",
    name: "description",
    componentType: "textarea",
    placeholder: "Enter product description",
  },
  {
    label: "Price",
    name: "price",
    componentType: "input",
    type: "number",
    placeholder: "Enter product price",
  },
  {
    label: "Total Stock",
    name: "totalStock",
    componentType: "input",
    type: "number",
    placeholder: "Enter total stock",
  },
];

export const shoppingViewHeaderMenuItems = [
  {
    id: "home",
    label: "Home",
    path: "/shop/home",
  },
  {
    id: "products",
    label: "Products",
    path: "/shop/listing",
  },
  {
    id: "pe-uniform",
    label: "P.E Uniform",
    path: "/shop/listing",
  },
  {
    id: "souvenirs",
    label: "Souvenirs",
    path: "/shop/listing",
  },
  {
    id: "books",
    label: "Books",
    path: "/shop/listing",
  },
  {
    id: "clothing",
    label: "Clothing",
    path: "/shop/listing",
  },
  {
    id: "accessories",
    label: "Accessories",
    path: "/shop/listing",
  },
  {
    id: "search",
    label: "Search",
    path: "/shop/search",
  },
];

export const categoryOptionsMap = {
  "pe-uniform": "P.E Uniform",
  souvenirs: "Souvenirs",
  books: "Books",
  clothing: "Clothing",
  accessories: "Accessories",
};


export const filterOptions = {
  category: [
    { id: "pe-uniform", label: "P.E Uniform" },
    { id: "souvenirs", label: "Souvenirs" },
    { id: "books", label: "Books" },
    { id: "clothing", label: "Clothing" },
    { id: "accessories", label: "Accessories" },
  ],
};

export const sortOptions = [
  { id: "price-lowtohigh", label: "Price: Low to High" },
  { id: "price-hightolow", label: "Price: High to Low" },
  { id: "title-atoz", label: "Title: A to Z" },
  { id: "title-ztoa", label: "Title: Z to A" },
];

export const addressFormControls = [
  {
    label: "Address",
    name: "address",
    componentType: "input",
    type: "text",
    placeholder: "Enter your address",
  },
  {
    label: "City",
    name: "city",
    componentType: "input",
    type: "text",
    placeholder: "Enter your city",
  },
  {
    label: "Pincode",
    name: "pincode",
    componentType: "input",
    type: "text",
    placeholder: "Enter your pincode",
  },
  {
    label: "Phone",
    name: "phone",
    componentType: "input",
    type: "tel",
    placeholder: "Enter your phone number",
    pattern: "[0-9]*",
  },
  {
    label: "Notes",
    name: "notes",
    componentType: "textarea",
    placeholder: "Enter any additional notes",
  },
];
