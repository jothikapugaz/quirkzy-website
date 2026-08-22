/* =========================================================
   QUIRKZY — MASTER SCRIPT.JS
   =========================================================

   Organized by system/page so future changes are easy.

   1. PRODUCT CATALOG
   2. SHARED HELPERS
   3. LOGIN SYSTEM
   4. BAG SYSTEM
   5. HOME / SHOP
   6. PRODUCT PAGE
   7. WISHLIST
   8. SIMILAR PRODUCTS
   9. CART / BAG PAGE
   10. REVIEWS
   11. CHECKOUT
   12. CUSTOM IDEA

   IMPORTANT:
   Add future products ONLY inside the PRODUCT CATALOG.
   ========================================================= */


/* =========================================================
   1. PRODUCT CATALOG
   ========================================================= */

const quirkzyProducts = [

    {
        name: "UFO Planter",
        price: "₹699",
        image: "assets/Quirkzy-ufoplanter.jpg",
        category: "plant-pals"
    },

    {
        name: "Desk Organizer",
        price: "₹499",
        image: "assets/Quirkzy-organizer.png",
        category: "desk-office"
    },

    {
        name: "Potter Pen Holder",
        price: "₹999",
        image: "assets/Quirkzy-potterpenholder.png",
        category: "desk-office"
    },

    {
        name: "Mushroom Lamp",
        price: "₹899",
        image: "assets/Quirkzy-mushroomlamp.png",
        category: "home-decor"
    }

];


/* =========================================================
   2. SHARED HELPERS
   ========================================================= */


/* ---------- Product lookup ---------- */

function getProductByName(productName) {

    return quirkzyProducts.find(function (product) {

        return product.name === productName;

    });

}


/* ---------- Save selected product ---------- */

function selectProduct(product) {

    if (!product) {
        return;
    }

    localStorage.setItem(
        "selectedProduct",
        JSON.stringify(product)
    );

}


/* ---------- Get selected product ---------- */

function getSelectedProduct() {

    const savedProduct =
        localStorage.getItem("selectedProduct");

    if (!savedProduct) {
        return null;
    }

    try {

        return JSON.parse(savedProduct);

    } catch (error) {

        console.error(
            "Could not read selected product.",
            error
        );

        return null;

    }

}


/* ---------- Price → number ---------- */

function getProductPrice(price) {

    if (!price) {
        return 0;
    }

    return Number(
        price
            .replace("₹", "")
            .replace(",", "")
            .trim()
    );

}


/* ---------- Login status ---------- */

function isUserLoggedIn() {

    return (
        localStorage.getItem("quirkzyUser") !== null
    );

}


/* ---------- Bag ---------- */

function getBag() {

    try {

        return (
            JSON.parse(
                localStorage.getItem("quirkzyBag")
            ) || []
        );

    } catch (error) {

        return [];

    }

}


function saveBag(bag) {

    localStorage.setItem(
        "quirkzyBag",
        JSON.stringify(bag)
    );

}


/* ---------- Wishlist ---------- */

function getWishlist() {

    try {

        return (
            JSON.parse(
                localStorage.getItem("quirkzyWishlist")
            ) || []
        );

    } catch (error) {

        return [];

    }

}


function saveWishlist(wishlist) {

    localStorage.setItem(
        "quirkzyWishlist",
        JSON.stringify(wishlist)
    );

}


/* =========================================================
   3. LOGIN SYSTEM
   ========================================================= */


/* ---------- Login elements ---------- */

const loginModal =
    document.querySelector("#login-modal");

const closeLogin =
    document.querySelector("#close-login");

const loginButton =
    document.querySelector("#login-button");

const loginName =
    document.querySelector("#login-name");

const loginEmail =
    document.querySelector("#login-email");


/* ---------- Open login ---------- */

function openLogin() {

    if (!loginModal) {
        return;
    }

    loginModal.classList.add("show");

}


/* ---------- Close login ---------- */

function closeLoginModal() {

    if (!loginModal) {
        return;
    }

    loginModal.classList.remove("show");

}


/* ---------- Close button ---------- */

if (closeLogin) {

    closeLogin.addEventListener(
        "click",
        closeLoginModal
    );

}


/* ---------- Click outside ---------- */

if (loginModal) {

    loginModal.addEventListener(
        "click",
        function (event) {

            if (event.target === loginModal) {

                closeLoginModal();

            }

        }
    );

}


/* ---------- Demo login ---------- */

if (loginButton) {

    loginButton.addEventListener(
        "click",
        function () {

            const name =
                loginName
                    ? loginName.value.trim()
                    : "";

            const email =
                loginEmail
                    ? loginEmail.value.trim()
                    : "";


            if (!name || !email) {

                alert(
                    "Please enter your name and email."
                );

                return;

            }


            const user = {

                name: name,

                email: email

            };


            localStorage.setItem(
                "quirkzyUser",
                JSON.stringify(user)
            );


            closeLoginModal();


            alert(
                "Welcome to Quirkzy, " +
                name +
                "! ♡"
            );

        }
    );

}


/* =========================================================
   4. BAG SYSTEM
   ========================================================= */


/* ---------- Toast ---------- */

const toast =
    document.querySelector("#toast");


function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add("show");


    setTimeout(
        function () {

            toast.classList.remove("show");

        },
        2000
    );

}


/* ---------- Bag count ---------- */

function getBagCount() {

    const bag =
        getBag();

    let count = 0;


    bag.forEach(function (item) {

        count +=
            Number(item.quantity) || 0;

    });


    return count;

}


/* ---------- Update bag count ---------- */

function updateBagCount() {

    const count =
        getBagCount();


    const bagButton =
        document.querySelector(".cart-button");


    if (bagButton) {

        bagButton.textContent =
            "♡ Bag (" + count + ")";

    }


    const productCartCount =
        document.querySelector(
            "#product-cart-count"
        );


    if (productCartCount) {

        productCartCount.textContent =
            count;

    }

}


/* ---------- Add product to bag ---------- */

function addProductToBag(product) {

    if (!product) {
        return false;
    }


    const bag =
        getBag();


    const existingProduct =
        bag.find(function (item) {

            return item.name === product.name;

        });


    if (existingProduct) {

        existingProduct.quantity =
            (Number(existingProduct.quantity) || 0) + 1;

    } else {

        bag.push({

            name:
                product.name,

            price:
                product.price,

            image:
                product.image,

            category:
                product.category || "",

            quantity:
                1

        });

    }


    saveBag(bag);

    updateBagCount();

    return true;

}


/* ---------- Add to bag with login ---------- */

function addProductToBagWithLogin(product) {

    if (!isUserLoggedIn()) {

        openLogin();

        return false;

    }


    const added =
        addProductToBag(product);


    if (added) {

        showToast(
            "✓ " +
            product.name +
            " added to your bag! ♡"
        );

    }


    return added;

}


/* ---------- Initial count ---------- */

updateBagCount();


/* =========================================================
   5. HOME / SHOP PAGE
   ========================================================= */
   

/* ---------- Quirkzy catalog menu ---------- */

const menuButton =
    document.querySelector("#menu-button");

const catalogMenu =
    document.querySelector("#catalog-menu");

const catalogOverlay =
    document.querySelector("#catalog-overlay");

const catalogClose =
    document.querySelector("#catalog-close");

const catalogShopToggle =
    document.querySelector("#catalog-shop-toggle");

const catalogSubmenu =
    document.querySelector("#catalog-submenu");

const catalogMenuLinks =
    document.querySelectorAll("[data-menu-link]");

const catalogCategories =
    document.querySelectorAll("[data-menu-category]");


/* ---------- Open menu ---------- */

function openCatalogMenu() {

    if (!catalogMenu || !catalogOverlay) {
        return;
    }

    catalogMenu.classList.add("show");
    catalogOverlay.classList.add("show");

    catalogMenu.setAttribute(
        "aria-hidden",
        "false"
    );

    if (menuButton) {
        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    document.body.style.overflow = "hidden";
}


/* ---------- Close menu ---------- */

function closeCatalogMenu() {

    if (!catalogMenu || !catalogOverlay) {
        return;
    }

    catalogMenu.classList.remove("show");
    catalogOverlay.classList.remove("show");

    catalogMenu.setAttribute(
        "aria-hidden",
        "true"
    );

    if (menuButton) {
        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    document.body.style.overflow = "";

    closeShopDropdown();
}


/* ---------- Open / close Shop ---------- */

function closeShopDropdown() {

    if (!catalogShopToggle || !catalogSubmenu) {
        return;
    }

    catalogShopToggle.classList.remove("open");
    catalogSubmenu.classList.remove("open");

    catalogShopToggle.setAttribute(
        "aria-expanded",
        "false"
    );
}


/* ---------- Hamburger ---------- */

if (menuButton) {

    menuButton.addEventListener(
        "click",
        openCatalogMenu
    );

}


/* ---------- Close button ---------- */

if (catalogClose) {

    catalogClose.addEventListener(
        "click",
        closeCatalogMenu
    );

}


/* ---------- Overlay ---------- */

if (catalogOverlay) {

    catalogOverlay.addEventListener(
        "click",
        closeCatalogMenu
    );

}


/* ---------- Shop dropdown ---------- */

if (
    catalogShopToggle &&
    catalogSubmenu
) {

    catalogShopToggle.addEventListener(
        "click",
        function () {

            const isOpen =
                catalogSubmenu.classList.contains(
                    "open"
                );

            catalogShopToggle.classList.toggle(
                "open",
                !isOpen
            );

            catalogSubmenu.classList.toggle(
                "open",
                !isOpen
            );

            catalogShopToggle.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

        }
    );

}


/* ---------- Normal menu links ---------- */

catalogMenuLinks.forEach(
    function (link) {

        link.addEventListener(
            "click",
            closeCatalogMenu
        );

    }
);


/* ---------- Category navigation ---------- */

catalogCategories.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const category =
                    button.dataset.menuCategory;

                const matchingButton =
                    document.querySelector(
                        '.category-btn[data-category="' +
                        category +
                        '"]'
                    );

                if (matchingButton) {

                    matchingButton.click();

                }

                const shopSection =
                    document.querySelector("#shop");

                if (shopSection) {

                    shopSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                closeCatalogMenu();

            }
        );

    }
);


/* ---------- Escape key ---------- */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {
            closeCatalogMenu();
        }

    }
);


/* ---------- Home product cards ---------- */

const homeProductCards =
    document.querySelectorAll(
        "#shop .product-card"
    );


/* ---------- Product card navigation ---------- */

homeProductCards.forEach(function (card) {


    const nameElement =
        card.querySelector("h3");

    const imageElement =
        card.querySelector("img");

    const priceElement =
        card.querySelector("span");


    if (
        !nameElement ||
        !imageElement ||
        !priceElement
    ) {

        return;

    }


    const productName =
        nameElement.textContent.trim();


    const product =
        getProductByName(productName);


    if (!product) {

        console.warn(
            "Product not found in catalog:",
            productName
        );

        return;

    }


    /* ---------- Card click ---------- */

    card.addEventListener(
        "click",
        function (event) {

            if (
                event.target.closest("button")
            ) {

                return;

            }


            sessionStorage.setItem(
                "quirkzyScrollPosition",
                window.scrollY
            );


            selectProduct(product);


            window.location.href =
                "product.html";

        }
    );


    /* ---------- Add to bag ---------- */

    const addButton =
        card.querySelector(
            ".product-info button"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                const added =
                    addProductToBagWithLogin(
                        product
                    );


                if (!added) {
                    return;
                }


                addButton.textContent =
                    "✓ Added";


                setTimeout(
                    function () {

                        addButton.textContent =
                            "Add to bag +";

                    },
                    1500
                );

            }
        );

    }

});


/* ---------- Category filter ---------- */

const categoryButtons =
    document.querySelectorAll(
        ".category-btn"
    );


categoryButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const selectedCategory =
                button.dataset.category;


            categoryButtons.forEach(
                function (categoryButton) {

                    categoryButton.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add(
                "active"
            );


            homeProductCards.forEach(
                function (productCard) {

                    const category =
                        productCard.dataset.category;


                    if (
                        selectedCategory === "all" ||
                        category === selectedCategory
                    ) {

                        productCard.style.display =
                            "";

                    } else {

                        productCard.style.display =
                            "none";

                    }

                }
            );

        }
    );

});


/* ---------- Restore scroll ---------- */

const savedScrollPosition =
    sessionStorage.getItem(
        "quirkzyScrollPosition"
    );


if (
    savedScrollPosition !== null &&
    document.querySelector("#shop")
) {

    document.documentElement.style.scrollBehavior =
        "auto";


    window.scrollTo(
        0,
        Number(savedScrollPosition)
    );


    setTimeout(
        function () {

            document.documentElement.style.scrollBehavior =
                "smooth";

        },
        50
    );


    sessionStorage.removeItem(
        "quirkzyScrollPosition"
    );

}


/* =========================================================
   6. PRODUCT PAGE
   ========================================================= */


/* ---------- Product details ---------- */

const productDetails = {

    "Mushroom Lamp": {

        description:
            "A cute mushroom-inspired lamp that adds a warm, cozy glow to your desk, bedside table, or reading corner. A wonderfully quirky little light for your space. ♡",

        dimensions:
            "18 cm × 12 cm × 12 cm",

        material:
            "ABS plastic + LED light",

        weight:
            "Approx. 450 g",

        features:
            "Warm LED light, compact design, USB powered",

        color:
            "Warm white / Red",

        care:
            "Wipe gently with a soft, dry cloth."

    },


    "UFO Planter": {

        description:
            "Give your little plant a spaceship of its own. This quirky UFO-inspired planter is perfect for succulents, small plants, and anyone who likes their greenery a little out of this world. 🛸",

        dimensions:
            "16 cm × 16 cm × 12 cm",

        material:
            "High-quality ceramic",

        weight:
            "Approx. 650 g",

        features:
            "Drainage hole, lightweight design, suitable for small plants",

        color:
            "White / Grey",

        care:
            "Clean with a soft damp cloth."

    },


    "Desk Organizer": {

        description:
            "Keep your desk a little less chaotic with this fun and functional organizer. Perfect for pens, pencils, stationery, and those tiny things that somehow disappear every day. ✨",

        dimensions:
            "22 cm × 10 cm × 12 cm",

        material:
            "Durable ABS plastic",

        weight:
            "Approx. 380 g",

        features:
            "Multiple compartments, compact footprint, easy to clean",

        color:
            "Pastel assorted",

        care:
            "Wipe with a damp cloth."

    },


    "Potter Pen Holder": {

        description:
            "A charming little holder inspired by pottery and handcrafted forms. Use it to keep your favourite stationery, brushes, accessories, or other small everyday treasures. 🏺",

        dimensions:
            "11 cm × 10 cm × 10 cm",

        material:
            "Ceramic",

        weight:
            "Approx. 520 g",

        features:
            "Stable base, compact design, decorative finish",

        color:
            "Terracotta",

        care:
            "Handle with care and wipe gently."

    }

};


/* ---------- Current selected product ---------- */

const currentProduct =
    getSelectedProduct();


/* ---------- Product page ---------- */

const productPage =
    document.querySelector(
        ".product-page"
    );


if (
    productPage &&
    currentProduct
) {


    const productImage =
        document.querySelector(
            "#product-image"
        );

    const productName =
        document.querySelector(
            "#product-name"
        );

    const productPrice =
        document.querySelector(
            "#product-price"
        );

    const productCategory =
        document.querySelector(
            "#product-category"
        );


    if (productImage) {

        productImage.src =
            currentProduct.image;

        productImage.alt =
            currentProduct.name;

    }


    if (productName) {

        productName.textContent =
            currentProduct.name;

    }


    if (productPrice) {

        productPrice.textContent =
            currentProduct.price;

    }


    if (productCategory) {

        productCategory.textContent =
            currentProduct.category;

    }


    const details =
        productDetails[
            currentProduct.name
        ];


    if (details) {

        const description =
            document.querySelector(
                "#product-description"
            );

        const dimensions =
            document.querySelector(
                "#product-dimensions"
            );

        const material =
            document.querySelector(
                "#product-material"
            );

        const weight =
            document.querySelector(
                "#product-weight"
            );

        const features =
            document.querySelector(
                "#product-features"
            );

        const color =
            document.querySelector(
                "#product-color"
            );

        const care =
            document.querySelector(
                "#product-care"
            );


        if (description) {

            description.textContent =
                details.description;

        }


        if (dimensions) {

            dimensions.textContent =
                details.dimensions;

        }


        if (material) {

            material.textContent =
                details.material;

        }


        if (weight) {

            weight.textContent =
                details.weight;

        }


        if (features) {

            features.textContent =
                details.features;

        }


        if (color) {

            color.textContent =
                details.color;

        }


        if (care) {

            care.textContent =
                details.care;

        }

    }

}


/* ---------- Product page Add to Bag ---------- */

const productAddButton =
    document.querySelector(
        "#add-to-bag"
    );


if (productAddButton) {

    productAddButton.addEventListener(
        "click",
        function () {

            if (!currentProduct) {

                alert(
                    "Product information not found."
                );

                return;

            }


            const added =
                addProductToBagWithLogin(
                    currentProduct
                );


            if (!added) {
                return;
            }


            productAddButton.textContent =
                "✓ Added to Bag";


            setTimeout(
                function () {

                    productAddButton.textContent =
                        "Add to Bag ♡";

                },
                1500
            );

        }
    );

}


/* ---------- Order Now ---------- */

const orderNowButton =
    document.querySelector(
        "#order-now"
    );


if (orderNowButton) {

    orderNowButton.addEventListener(
        "click",
        function () {

            if (!isUserLoggedIn()) {

                openLogin();

                return;

            }


            if (!currentProduct) {

                alert(
                    "Product information not found."
                );

                return;

            }


            const checkoutProduct = {

                name:
                    currentProduct.name,

                price:
                    currentProduct.price,

                image:
                    currentProduct.image,

                category:
                    currentProduct.category || "",

                quantity:
                    1

            };


            localStorage.setItem(
                "quirkzyCheckoutItems",
                JSON.stringify([
                    checkoutProduct
                ])
            );


            window.location.href =
                "checkout.html";

        }
    );

}


/* =========================================================
   7. WISHLIST
   ========================================================= */


/* ---------- Wishlist check ---------- */

function isProductWishlisted(productName) {

    const wishlist =
        getWishlist();


    return wishlist.some(
        function (item) {

            return item.name === productName;

        }
    );

}


/* ---------- Add wishlist ---------- */

function addToWishlist(product) {

    if (!product) {
        return false;
    }


    const wishlist =
        getWishlist();


    if (
        wishlist.some(
            function (item) {

                return item.name === product.name;

            }
        )
    ) {

        return false;

    }


    wishlist.push({

        name:
            product.name,

        price:
            product.price,

        image:
            product.image,

        category:
            product.category || ""

    });


    saveWishlist(wishlist);

    return true;

}


/* ---------- Remove wishlist ---------- */

function removeFromWishlist(productName) {

    let wishlist =
        getWishlist();


    wishlist =
        wishlist.filter(
            function (item) {

                return item.name !== productName;

            }
        );


    saveWishlist(wishlist);

}


/* ---------- Toggle wishlist ---------- */

function toggleWishlist(product) {

    if (!product) {
        return false;
    }


    if (
        isProductWishlisted(
            product.name
        )
    ) {

        removeFromWishlist(
            product.name
        );

        return false;

    }


    addToWishlist(product);

    return true;

}


/* ---------- Wishlist button state ---------- */

function updateWishlistButton(
    button,
    productName
) {

    if (!button) {
        return;
    }


    const active =
        isProductWishlisted(
            productName
        );


    button.classList.toggle(
        "active",
        active
    );


    button.setAttribute(
        "aria-pressed",
        active
            ? "true"
            : "false"
    );


    button.setAttribute(
        "aria-label",
        active
            ? "Remove from wishlist"
            : "Add to wishlist"
    );

}


/* ---------- Wishlist click ---------- */

function handleWishlistClick(
    button,
    product
) {

    if (!product) {
        return;
    }


    if (!isUserLoggedIn()) {

        openLogin();

        return;

    }


    toggleWishlist(product);


    updateWishlistButton(
        button,
        product.name
    );

}


/* ---------- Product page wishlist ---------- */

const productWishlistButton =
    document.querySelector(
        "#product-wishlist-button"
    );


if (
    productWishlistButton &&
    currentProduct
) {

    updateWishlistButton(
        productWishlistButton,
        currentProduct.name
    );


    productWishlistButton.addEventListener(
        "click",
        function () {

            handleWishlistClick(
                productWishlistButton,
                currentProduct
            );

        }
    );

}


/* ---------- Create home wishlist hearts ---------- */

homeProductCards.forEach(
    function (card) {

        const nameElement =
            card.querySelector("h3");


        if (!nameElement) {
            return;
        }


        const product =
            getProductByName(
                nameElement.textContent.trim()
            );


        if (!product) {
            return;
        }


        if (
            card.querySelector(
                ".card-wishlist-button"
            )
        ) {

            return;

        }


        const heartButton =
            document.createElement(
                "button"
            );


        heartButton.type =
            "button";


        heartButton.classList.add(
            "card-wishlist-button"
        );


        heartButton.innerHTML = `

            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <path
                    d="M20.8 8.7
                       C20.8 5.9 18.7 4 16.1 4
                       C14.6 4 13.2 4.7 12 6
                       C10.8 4.7 9.4 4 7.9 4
                       C5.3 4 3.2 5.9 3.2 8.7
                       C3.2 13.2 7.2 16.1 12 20
                       C16.8 16.1 20.8 13.2 20.8 8.7Z"
                />

            </svg>

        `;


        card.appendChild(
            heartButton
        );


        updateWishlistButton(
            heartButton,
            product.name
        );


        heartButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                handleWishlistClick(
                    heartButton,
                    product
                );

            }
        );

    }
);


/* ---------- Wishlist page ---------- */

const wishlistGrid =
    document.querySelector(
        "#wishlist-grid"
    );

const emptyWishlist =
    document.querySelector(
        "#empty-wishlist"
    );


if (wishlistGrid) {

    const savedWishlist =
        getWishlist();


    wishlistGrid.innerHTML = "";


    if (savedWishlist.length === 0) {

        wishlistGrid.style.display =
            "none";


        if (emptyWishlist) {

            emptyWishlist.style.display =
                "block";

        }

    } else {

        wishlistGrid.style.display =
            "";


        if (emptyWishlist) {

            emptyWishlist.style.display =
                "none";

        }


        savedWishlist.forEach(
            function (product) {

                const card =
                    document.createElement(
                        "article"
                    );


                card.classList.add(
                    "product-card"
                );


                card.dataset.category =
                    product.category || "";


                card.innerHTML = `

                    <img
                        src="${product.image}"
                        alt="${product.name}"
                    >

                    <div class="product-info">

                        <h3>
                            ${product.name}
                        </h3>

                        <span>
                            ${product.price}
                        </span>

                        <button
                            type="button"
                            class="wishlist-add-bag"
                        >
                            Add to bag +
                        </button>

                    </div>

                `;


                /* Heart */

                const heartButton =
                    document.createElement(
                        "button"
                    );


                heartButton.type =
                    "button";


                heartButton.classList.add(
                    "card-wishlist-button",
                    "active"
                );


                heartButton.setAttribute(
                    "aria-label",
                    "Remove from wishlist"
                );


                heartButton.setAttribute(
                    "aria-pressed",
                    "true"
                );


                heartButton.innerHTML = `

                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >

                        <path
                            d="M20.8 8.7
                               C20.8 5.9 18.7 4 16.1 4
                               C14.6 4 13.2 4.7 12 6
                               C10.8 4.7 9.4 4 7.9 4
                               C5.3 4 3.2 5.9 3.2 8.7
                               C3.2 13.2 7.2 16.1 12 20
                               C16.8 16.1 20.8 13.2 20.8 8.7Z"
                        />

                    </svg>

                `;


                card.appendChild(
                    heartButton
                );


                /* Remove wishlist */

                heartButton.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();


                        if (!isUserLoggedIn()) {

                            openLogin();

                            return;

                        }


                        removeFromWishlist(
                            product.name
                        );


                        card.remove();


                        const remaining =
                            getWishlist();


                        if (
                            remaining.length === 0
                        ) {

                            wishlistGrid.style.display =
                                "none";


                            if (emptyWishlist) {

                                emptyWishlist.style.display =
                                    "block";

                            }

                        }

                    }
                );


                /* Card navigation */

                card.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target.closest(
                                "button"
                            )
                        ) {

                            return;

                        }


                        selectProduct(
                            product
                        );


                        window.location.href =
                            "product.html";

                    }
                );


                /* Add to bag */

                const addButton =
                    card.querySelector(
                        ".wishlist-add-bag"
                    );


                if (addButton) {

                    addButton.addEventListener(
                        "click",
                        function (event) {

                            event.stopPropagation();


                            const added =
                                addProductToBagWithLogin(
                                    product
                                );


                            if (!added) {
                                return;
                            }


                            addButton.textContent =
                                "✓ Added";


                            setTimeout(
                                function () {

                                    addButton.textContent =
                                        "Add to bag +";

                                },
                                1500
                            );

                        }
                    );

                }


                wishlistGrid.appendChild(
                    card
                );

            }
        );

    }

}


/* =========================================================
   8. SIMILAR PRODUCTS
   ========================================================= */

const similarProductsGrid =
    document.querySelector(
        "#similar-products-grid"
    );


if (
    similarProductsGrid &&
    currentProduct
) {

    similarProductsGrid.innerHTML =
        "";


    quirkzyProducts.forEach(
        function (product) {

            if (
                product.name ===
                currentProduct.name
            ) {

                return;

            }


            const card =
                document.createElement(
                    "article"
                );


            card.classList.add(
                "product-card"
            );


            card.dataset.category =
                product.category || "";


            card.innerHTML = `

                <img
                    src="${product.image}"
                    alt="Quirkzy ${product.name}"
                >

                <div class="product-info">

                    <h3>
                        ${product.name}
                    </h3>

                    <span>
                        ${product.price}
                    </span>

                    <button
                        type="button"
                        class="similar-add-bag"
                    >
                        Add to bag +
                    </button>

                </div>

            `;


            /* ---------- Heart ---------- */

            const heartButton =
                document.createElement(
                    "button"
                );


            heartButton.type =
                "button";


            heartButton.classList.add(
                "card-wishlist-button"
            );


            heartButton.innerHTML = `

                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >

                    <path
                        d="M20.8 8.7
                           C20.8 5.9 18.7 4 16.1 4
                           C14.6 4 13.2 4.7 12 6
                           C10.8 4.7 9.4 4 7.9 4
                           C5.3 4 3.2 5.9 3.2 8.7
                           C3.2 13.2 7.2 16.1 12 20
                           C16.8 16.1 20.8 13.2 20.8 8.7Z"
                    />

                </svg>

            `;


            card.appendChild(
                heartButton
            );


            updateWishlistButton(
                heartButton,
                product.name
            );


            heartButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();


                    handleWishlistClick(
                        heartButton,
                        product
                    );

                }
            );


            /* ---------- Card navigation ---------- */

            card.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target.closest(
                            "button"
                        )
                    ) {

                        return;

                    }


                    selectProduct(
                        product
                    );


                    window.location.href =
                        "product.html";

                }
            );


            /* ---------- Add to bag ---------- */

            const addButton =
                card.querySelector(
                    ".similar-add-bag"
                );


            if (addButton) {

                addButton.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();


                        const added =
                            addProductToBagWithLogin(
                                product
                            );


                        if (!added) {
                            return;
                        }


                        addButton.textContent =
                            "✓ Added";


                        setTimeout(
                            function () {

                                addButton.textContent =
                                    "Add to bag +";

                            },
                            1500
                        );

                    }
                );

            }


            similarProductsGrid.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   9. CART / BAG PAGE
   ========================================================= */

const cartItems =
    document.querySelector(
        "#cart-items"
    );

const cartSummary =
    document.querySelector(
        "#cart-summary"
    );


/* ---------- Cart summary ---------- */

function updateCartSummary() {

    const bag =
        getBag();


    let subtotal =
        0;


    bag.forEach(
        function (item) {

            const price =
                getProductPrice(
                    item.price
                );


            subtotal +=
                price *
                (Number(item.quantity) || 0);

        }
    );


    const shipping =
        50;


    const total =
        subtotal + shipping;


    return {

        subtotal:
            subtotal,

        shipping:
            shipping,

        total:
            total

    };

}


/* ---------- Render cart ---------- */

function renderCart() {

    if (!cartItems) {
        return;
    }


    const bag =
        getBag();


    cartItems.innerHTML =
        "";


    if (bag.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-bag">

                <h2>
                    Your bag is feeling a little empty.
                </h2>

                <p>
                    But there are plenty of wonderfully weird
                    things waiting for you.
                </p>

                <a href="index.html#shop">
                    Find your quirk →
                </a>

            </div>

        `;


        if (cartSummary) {
            cartSummary.innerHTML = "";
        }


        return;

    }


    bag.forEach(
        function (item) {

            const card =
                document.createElement(
                    "div"
                );


            card.classList.add(
                "cart-item"
            );


            const price =
                getProductPrice(
                    item.price
                );


            const quantity =
                Number(item.quantity) || 1;


            const lineTotal =
                price * quantity;


            card.innerHTML = `

                <div class="cart-product">

                    <div class="cart-product-image">

                        <img
                            src="${item.image}"
                            alt="${item.name}"
                        >

                    </div>


                    <div class="cart-product-details">

                        <h3>
                            ${item.name}
                        </h3>

                        <p>
                            ${item.price} each
                        </p>


                        <div class="cart-product-actions">

                            <div class="quantity-controls">

                                <button
                                    type="button"
                                    class="decrease"
                                >
                                    −
                                </button>

                                <span>
                                    ${quantity}
                                </span>

                                <button
                                    type="button"
                                    class="increase"
                                >
                                    +
                                </button>

                            </div>


                            <button
                                type="button"
                                class="remove-product"
                                aria-label="Remove ${item.name}"
                            >
                                <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z"/>
    </svg>
                            </button>

                        </div>

                    </div>


                    <div class="cart-product-total">

                        <span class="line-total">
                            ₹${lineTotal}
                        </span>

                    </div>

                </div>

            `;


            const decreaseButton =
                card.querySelector(
                    ".decrease"
                );


            const increaseButton =
                card.querySelector(
                    ".increase"
                );


            const removeButton =
                card.querySelector(
                    ".remove-product"
                );


            const quantityDisplay =
                card.querySelector(
                    ".quantity-controls span"
                );


            const lineTotalDisplay =
                card.querySelector(
                    ".line-total"
                );


            /* ---------- Increase ---------- */

            increaseButton.addEventListener(
                "click",
                function () {

                    item.quantity =
                        (Number(item.quantity) || 0) + 1;


                    saveBag(bag);


                    renderCart();

                    updateBagCount();

                }
            );


            /* ---------- Decrease ---------- */

            decreaseButton.addEventListener(
                "click",
                function () {

                    if (
                        Number(item.quantity) <= 1
                    ) {

                        return;

                    }


                    item.quantity -= 1;


                    saveBag(bag);


                    renderCart();

                    updateBagCount();

                }
            );


            /* ---------- Remove ---------- */

            removeButton.addEventListener(
                "click",
                function () {

                    const updatedBag =
                        bag.filter(
                            function (bagItem) {

                                return (
                                    bagItem.name !==
                                    item.name
                                );

                            }
                        );


                    saveBag(
                        updatedBag
                    );


                    renderCart();

                    updateBagCount();

                }
            );


            cartItems.appendChild(
                card
            );

        }
    );


    /* ---------- Summary ---------- */

    if (cartSummary) {

        const totals =
            updateCartSummary();


        cartSummary.innerHTML = `

            <div class="cart-summary">

                <p class="summary-label">
                    Your order
                </p>


                <div class="summary-row">

                    <span>
                        Subtotal
                    </span>

                    <span class="subtotal-amount">
                        ₹${totals.subtotal}
                    </span>

                </div>


                <div class="summary-row">

                    <span>
                        Shipping
                    </span>

                    <span>
                        ₹${totals.shipping}
                    </span>

                </div>


                <div class="summary-divider"></div>


                <div class="summary-total">

                    <span>
                        Total
                    </span>

                    <strong>
                        ₹${totals.total}
                    </strong>

                </div>


                <button
                    type="button"
                    class="checkout-button"
                >
                    Checkout →
                </button>

            </div>

        `;


        const checkoutButton =
            cartSummary.querySelector(
                ".checkout-button"
            );


        if (checkoutButton) {

            checkoutButton.addEventListener(
                "click",
                function () {

                    if (!isUserLoggedIn()) {

                        openLogin();

                        return;

                    }


                    const currentBag =
                        getBag();


                    if (
                        currentBag.length === 0
                    ) {

                        alert(
                            "Your bag is empty. Add a quirk first! ♡"
                        );

                        return;

                    }


                    localStorage.setItem(
                        "quirkzyCheckoutItems",
                        JSON.stringify(
                            currentBag
                        )
                    );


                    window.location.href =
                        "checkout.html";

                }
            );

        }

    }

}


renderCart();


/* =========================================================
   10. REVIEWS
   ========================================================= */


/* ---------- Review elements ---------- */

const starButtons =
    document.querySelectorAll(
        "#star-input button"
    );


const reviewText =
    document.querySelector(
        "#review-text"
    );


const submitReview =
    document.querySelector(
        "#submit-review"
    );


const reviewsList =
    document.querySelector(
        "#reviews-list"
    );


const averageRating =
    document.querySelector(
        "#average-rating"
    );


const ratingCount =
    document.querySelector(
        "#rating-count"
    );


let selectedRating =
    0;


let reviewStorageKey =
    "";


if (currentProduct) {

    reviewStorageKey =
        "quirkzyReviews_" +
        currentProduct.name;

}


let productReviews =
    [];


if (reviewStorageKey) {

    try {

        productReviews =
            JSON.parse(
                localStorage.getItem(
                    reviewStorageKey
                )
            ) || [];

    } catch (error) {

        productReviews = [];

    }

}


/* ---------- Star selection ---------- */

if (starButtons.length > 0) {

    starButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    selectedRating =
                        Number(
                            button.dataset.rating
                        );


                    starButtons.forEach(
                        function (star) {

                            const rating =
                                Number(
                                    star.dataset.rating
                                );


                            star.classList.toggle(
                                "selected",
                                rating <=
                                    selectedRating
                            );

                        }
                    );

                }
            );

        }
    );

}


/* ---------- Display reviews ---------- */

function displayReviews() {

    if (!reviewsList) {
        return;
    }


    reviewsList.innerHTML =
        "";


    if (
        productReviews.length === 0
    ) {

        reviewsList.innerHTML = `

            <p class="no-reviews">
                No reviews yet. Be the first to leave one! ♡
            </p>

        `;


        return;

    }


    productReviews.forEach(
        function (review) {

            const reviewElement =
                document.createElement(
                    "div"
                );


            reviewElement.classList.add(
                "review-card"
            );


            let stars =
                "";


            for (
                let i = 1;
                i <= 5;
                i++
            ) {

                stars +=
                    i <= review.rating
                        ? "★"
                        : "☆";

            }


            reviewElement.innerHTML = `

                <div class="review-card-header">

                    <strong>
                        ${review.name}
                    </strong>

                    <span class="review-stars">
                        ${stars}
                    </span>

                </div>

                <p>
                    ${review.text}
                </p>

            `;


            reviewsList.appendChild(
                reviewElement
            );

        }
    );

}


/* ---------- Rating summary ---------- */

function updateRatingSummary() {

    if (
        !averageRating ||
        !ratingCount
    ) {

        return;

    }


    const totalReviews =
        productReviews.length;


    if (totalReviews === 0) {

        averageRating.textContent =
            "0.0";


        ratingCount.textContent =
            "No reviews yet";


        return;

    }


    let totalRating =
        0;


    productReviews.forEach(
        function (review) {

            totalRating +=
                Number(review.rating);

        }
    );


    const average =
        totalRating /
        totalReviews;


    averageRating.textContent =
        average.toFixed(1);


    ratingCount.textContent =
        totalReviews === 1
            ? "1 review"
            : totalReviews + " reviews";

}


/* ---------- Submit review ---------- */

if (submitReview) {

    submitReview.addEventListener(
        "click",
        function () {

            if (!isUserLoggedIn()) {

                openLogin();

                return;

            }


            if (selectedRating === 0) {

                alert(
                    "Please choose a star rating first. ⭐"
                );

                return;

            }


            if (!reviewText) {
                return;
            }


            const text =
                reviewText.value.trim();


            if (!text) {

                alert(
                    "Please write something before posting your review."
                );

                return;

            }


            const user =
                JSON.parse(
                    localStorage.getItem(
                        "quirkzyUser"
                    )
                );


            const newReview = {

                name:
                    user.name,

                rating:
                    selectedRating,

                text:
                    text,

                date:
                    new Date().toISOString()

            };


            productReviews.push(
                newReview
            );


            localStorage.setItem(
                reviewStorageKey,
                JSON.stringify(
                    productReviews
                )
            );


            updateRatingSummary();

            displayReviews();


            selectedRating =
                0;


            starButtons.forEach(
                function (star) {

                    star.classList.remove(
                        "selected"
                    );

                }
            );


            reviewText.value =
                "";


            alert(
                "Your review has been posted! ♡"
            );

        }
    );

}


updateRatingSummary();

displayReviews();


/* =========================================================
   11. CHECKOUT
   ========================================================= */

const checkoutItemsContainer =
    document.querySelector(
        "#checkout-items"
    );


if (checkoutItemsContainer) {

    let checkoutItems =
        [];


    try {

        checkoutItems =
            JSON.parse(
                localStorage.getItem(
                    "quirkzyCheckoutItems"
                )
            ) || [];

    } catch (error) {

        checkoutItems = [];

    }


    /* ---------- Display items ---------- */

    if (
        checkoutItems.length === 0
    ) {

        checkoutItemsContainer.innerHTML = `

            <p>
                Your checkout is empty.
            </p>

            <a href="index.html#shop">
                Find your quirk →
            </a>

        `;

    } else {

        checkoutItemsContainer.innerHTML =
            "";


        checkoutItems.forEach(
            function (item) {

                const price =
                    getProductPrice(
                        item.price
                    );


                const quantity =
                    Number(item.quantity) || 1;


                const lineTotal =
                    price * quantity;


                const itemElement =
                    document.createElement(
                        "div"
                    );


                itemElement.classList.add(
                    "checkout-item"
                );


                itemElement.innerHTML = `

                    <div class="checkout-item-image">

                        <img
                            src="${item.image}"
                            alt="${item.name}"
                        >

                    </div>


                    <div class="checkout-item-details">

                        <strong>
                            ${item.name}
                        </strong>

                        <span>
                            ${quantity} × ${item.price}
                        </span>

                    </div>


                    <strong class="checkout-item-total">
                        ₹${lineTotal}
                    </strong>

                `;


                checkoutItemsContainer.appendChild(
                    itemElement
                );

            }
        );


        /* ---------- Totals ---------- */

        let subtotal =
            0;


        checkoutItems.forEach(
            function (item) {

                subtotal +=
                    getProductPrice(
                        item.price
                    ) *
                    (Number(item.quantity) || 1);

            }
        );


        const shipping =
            50;


        const total =
            subtotal + shipping;


        const subtotalElement =
            document.querySelector(
                ".checkout-subtotal"
            );


        const shippingElement =
            document.querySelector(
                ".checkout-shipping"
            );


        const totalElement =
            document.querySelector(
                ".checkout-total"
            );


        if (subtotalElement) {

            subtotalElement.textContent =
                "₹" + subtotal;

        }


        if (shippingElement) {

            shippingElement.textContent =
                "₹" + shipping;

        }


        if (totalElement) {

            totalElement.textContent =
                "₹" + total;

        }

    }


    /* ---------- Place order ---------- */

    const placeOrderButton =
        document.querySelector(
            "#place-order-button"
        );


    const successMessage =
        document.querySelector(
            "#order-success"
        );


    if (placeOrderButton) {

        placeOrderButton.addEventListener(
            "click",
            function () {

                if (
                    checkoutItems.length === 0
                ) {

                    alert(
                        "Your checkout is empty."
                    );

                    return;

                }


                const nameInput =
                    document.querySelector(
                        "#checkout-name"
                    );


                const emailInput =
                    document.querySelector(
                        "#checkout-email"
                    );


                const phoneInput =
                    document.querySelector(
                        "#checkout-phone"
                    );


                const addressInput =
                    document.querySelector(
                        "#checkout-address"
                    );


                const cityInput =
                    document.querySelector(
                        "#checkout-city"
                    );


                const pincodeInput =
                    document.querySelector(
                        "#checkout-pincode"
                    );


                if (
                    !nameInput ||
                    !emailInput ||
                    !phoneInput ||
                    !addressInput ||
                    !cityInput ||
                    !pincodeInput
                ) {

                    return;

                }


                const name =
                    nameInput.value.trim();


                const email =
                    emailInput.value.trim();


                const phone =
                    phoneInput.value.trim();


                const address =
                    addressInput.value.trim();


                const city =
                    cityInput.value.trim();


                const pincode =
                    pincodeInput.value.trim();


                /* ---------- Error elements ---------- */

                const emailError =
                    document.querySelector(
                        "#checkout-email-error"
                    );


                const phoneError =
                    document.querySelector(
                        "#checkout-phone-error"
                    );


                const pincodeError =
                    document.querySelector(
                        "#checkout-pincode-error"
                    );


                document
                    .querySelectorAll(
                        ".field-error"
                    )
                    .forEach(
                        function (error) {

                            error.classList.remove(
                                "show"
                            );

                            error.textContent =
                                "";

                        }
                    );


                document
                    .querySelectorAll(
                        ".input-error"
                    )
                    .forEach(
                        function (input) {

                            input.classList.remove(
                                "input-error"
                            );

                        }
                    );


                let isValid =
                    true;


                /* ---------- Required ---------- */

                if (
                    !name ||
                    !email ||
                    !phone ||
                    !address ||
                    !city ||
                    !pincode
                ) {

                    isValid =
                        false;

                }


                /* ---------- Email ---------- */

                const emailPattern =
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


                if (
                    !emailPattern.test(
                        email
                    )
                ) {

                    isValid =
                        false;


                    emailInput.classList.add(
                        "input-error"
                    );


                    if (emailError) {

                        emailError.textContent =
                            "Please enter a valid email address.";

                        emailError.classList.add(
                            "show"
                        );

                    }

                }


                /* ---------- Phone ---------- */

                const phonePattern =
                    /^[6-9][0-9]{9}$/;


                if (
                    !phonePattern.test(
                        phone
                    )
                ) {

                    isValid =
                        false;


                    phoneInput.classList.add(
                        "input-error"
                    );


                    if (phoneError) {

                        phoneError.textContent =
                            "Enter a valid 10-digit Indian mobile number.";

                        phoneError.classList.add(
                            "show"
                        );

                    }

                }


                /* ---------- PIN ---------- */

                const pincodePattern =
                    /^[1-9][0-9]{5}$/;


                if (
                    !pincodePattern.test(
                        pincode
                    )
                ) {

                    isValid =
                        false;


                    pincodeInput.classList.add(
                        "input-error"
                    );


                    if (pincodeError) {

                        pincodeError.textContent =
                            "PIN code must be exactly 6 digits.";

                        pincodeError.classList.add(
                            "show"
                        );

                    }

                }


                if (!isValid) {

                    const firstError =
                        document.querySelector(
                            ".input-error"
                        );


                    if (firstError) {

                        firstError.focus();

                    }


                    return;

                }


                /* ---------- Payment ---------- */

                const paymentInput =
                    document.querySelector(
                        'input[name="payment"]:checked'
                    );


                const payment =
                    paymentInput
                        ? paymentInput.value
                        : "cod";


                /* ---------- Create order ---------- */

                const order = {

                    orderId:
                        "QZ" +
                        Date.now(),

                    customer: {

                        name:
                            name,

                        email:
                            email,

                        phone:
                            phone,

                        address:
                            address,

                        city:
                            city,

                        pincode:
                            pincode

                    },

                    payment:
                        payment,

                    items:
                        checkoutItems,

                    date:
                        new Date().toISOString()

                };


                localStorage.setItem(
                    "quirkzyLastOrder",
                    JSON.stringify(
                        order
                    )
                );


                /* ---------- Remove purchased items ---------- */

                let bag =
                    getBag();


                checkoutItems.forEach(
                    function (checkoutItem) {

                        const bagItem =
                            bag.find(
                                function (item) {

                                    return (
                                        item.name ===
                                        checkoutItem.name
                                    );

                                }
                            );


                        if (!bagItem) {
                            return;
                        }


                        bagItem.quantity -=
                            Number(
                                checkoutItem.quantity
                            ) || 1;


                        if (
                            bagItem.quantity <= 0
                        ) {

                            bag =
                                bag.filter(
                                    function (item) {

                                        return (
                                            item.name !==
                                            checkoutItem.name
                                        );

                                    }
                                );

                        }

                    }
                );


                saveBag(
                    bag
                );


                updateBagCount();


                /* ---------- Clear checkout ---------- */

                localStorage.removeItem(
                    "quirkzyCheckoutItems"
                );


                /* ---------- Success ---------- */

                if (successMessage) {

                    successMessage.classList.add(
                        "show"
                    );

                } else {

                    alert(
                        "Your order has been placed successfully! ♡"
                    );

                }

            }
        );

    }

}


/* =========================================================
   12. CUSTOM IDEA
   ========================================================= */

const customIdeaButton =
    document.querySelector("#custom-idea-button");

if (customIdeaButton) {

    customIdeaButton.addEventListener(
        "click",
        function () {

            if (!isUserLoggedIn()) {
                openLogin();
                return;
            }

            window.location.href =
                "custom.html";
        }
    );
}


/* =========================================================
   CUSTOM REQUEST PAGE
   ========================================================= */

const customRequestForm =
    document.querySelector("#custom-request-form");

if (customRequestForm) {

    const customName =
        document.querySelector("#custom-name");

    const customEmail =
        document.querySelector("#custom-email");

    const customPhone =
        document.querySelector("#custom-phone");

    const customDescription =
        document.querySelector("#custom-description");

    const customDescriptionCount =
        document.querySelector("#custom-description-count");

    const customImages =
        document.querySelector("#custom-images");

    const customImagePreview =
        document.querySelector("#custom-image-preview");

    const customSuccess =
        document.querySelector("#custom-success");

    const customSuccessHome =
        document.querySelector("#custom-success-home");


    /* ---------- Description counter ---------- */

    if (customDescription) {

        customDescription.addEventListener(
            "input",
            function () {

                if (
                    customDescription.value.length >
                    1000
                ) {
                    customDescription.value =
                        customDescription.value.slice(
                            0,
                            1000
                        );
                }

                customDescriptionCount.textContent =
                    customDescription.value.length;
            }
        );
    }


    /* ---------- Image handling ---------- */

    let selectedImages = [];


    function renderCustomImages() {

        customImagePreview.innerHTML = "";

        selectedImages.forEach(
            function (image, index) {

                const preview =
                    document.createElement("div");

                preview.classList.add(
                    "custom-preview-item"
                );

                preview.innerHTML = `
                    <img
                        src="${image.preview}"
                        alt="Custom idea reference"
                    >

                    <button
                        type="button"
                        class="custom-preview-remove"
                        data-index="${index}"
                        aria-label="Remove image"
                    >
                        ×
                    </button>
                `;

                customImagePreview.appendChild(
                    preview
                );
            }
        );
    }


    if (customImages) {

        customImages.addEventListener(
            "change",
            function () {

                const files =
                    Array.from(
                        customImages.files
                    );

                if (
                    selectedImages.length +
                    files.length >
                    3
                ) {

                    alert(
                        "You can upload up to 3 reference images."
                    );

                    customImages.value = "";

                    return;
                }


                files.forEach(
                    function (file) {

                        if (
                            !file.type.startsWith(
                                "image/"
                            )
                        ) {
                            return;
                        }

                        if (
                            file.size >
                            5 * 1024 * 1024
                        ) {

                            alert(
                                file.name +
                                " is larger than 5 MB."
                            );

                            return;
                        }


                        const reader =
                            new FileReader();

                        reader.onload =
                            function (event) {

                                selectedImages.push({
                                    name:
                                        file.name,

                                    preview:
                                        event.target.result
                                });

                                renderCustomImages();
                            };

                        reader.readAsDataURL(file);
                    }
                );

                customImages.value = "";
            }
        );
    }


    /* ---------- Remove image ---------- */

    if (customImagePreview) {

        customImagePreview.addEventListener(
            "click",
            function (event) {

                const removeButton =
                    event.target.closest(
                        ".custom-preview-remove"
                    );

                if (!removeButton) {
                    return;
                }

                const index =
                    Number(
                        removeButton.dataset.index
                    );

                selectedImages.splice(
                    index,
                    1
                );

                renderCustomImages();
            }
        );
    }


    /* ---------- Form submission ---------- */

    customRequestForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            /* ----- Login check ----- */

            if (!isUserLoggedIn()) {

                openLogin();

                return;
            }


            /* ----- Basic validation ----- */

            let valid = true;


            const clearError =
                function (id) {

                    const element =
                        document.querySelector(id);

                    if (element) {
                        element.classList.remove(
                            "show"
                        );
                    }
                };


            clearError("#custom-name-error");
            clearError("#custom-email-error");
            clearError("#custom-phone-error");
            clearError("#custom-title-error");
            clearError("#custom-description-error");
            clearError("#custom-category-error");
            clearError("#custom-quantity-error");
            clearError("#custom-images-error");


            const name =
                customName.value.trim();

            const email =
                customEmail.value.trim();

            const phone =
                customPhone.value.trim();

            const title =
                document.querySelector("#custom-title").value.trim();

            const description =
                customDescription.value.trim();

            const categoryEl =
                document.querySelector(
                    'input[name="category"]:checked'
                );

            const quantity =
                Number(
                    document.querySelector("#custom-quantity").value
                ) || 1;


            /* ----- Validate Name ----- */
            if (name.length < 2) {

                const error =
                    document.querySelector(
                        "#custom-name-error"
                    );

                error.textContent =
                    "Please enter your name.";

                error.classList.add("show");

                valid = false;
            }

            /* ----- Validate Email ----- */
            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {

                const error =
                    document.querySelector(
                        "#custom-email-error"
                    );

                error.textContent =
                    "Please enter a valid email.";

                error.classList.add("show");

                valid = false;
            }

            /* ----- Validate Phone ----- */
            const phonePattern =
                /^[6-9][0-9]{9}$/;

            if (!phonePattern.test(phone)) {

                const error =
                    document.querySelector(
                        "#custom-phone-error"
                    );

                error.textContent =
                    "Enter a valid 10-digit Indian mobile number.";

                error.classList.add("show");

                valid = false;
            }

            /* ----- Validate Title ----- */
            if (title.length < 2) {
                const error =
                    document.querySelector(
                        "#custom-title-error"
                    );
                error.textContent =
                    "Please give your idea a name.";
                error.classList.add("show");
                valid = false;
            }

            /* ----- Validate Description ----- */
            if (description.length < 10) {
                const error =
                    document.querySelector(
                        "#custom-description-error"
                    );
                error.textContent =
                    "Please describe your idea in at least 10 characters.";
                error.classList.add("show");
                valid = false;
            }

            /* ----- Validate Category ----- */
            if (!categoryEl) {
                const error =
                    document.querySelector(
                        "#custom-category-error"
                    );
                error.textContent =
                    "Please select a category.";
                error.classList.add("show");
                valid = false;
            }

            /* ----- Validate Quantity ----- */
            if (quantity < 1 || quantity > 100) {
                const error =
                    document.querySelector(
                        "#custom-quantity-error"
                    );
                error.textContent =
                    "Quantity must be between 1 and 100.";
                error.classList.add("show");
                valid = false;
            }


            /* ---- ⭐ NEW: Scroll to first error if invalid ---- */
            if (!valid) {
                // Find the first visible error message
                const firstError = document.querySelector('.custom-error.show');
                if (firstError) {
                    // Find the parent field and its input
                    const field = firstError.closest('.custom-field');
                    if (field) {
                        const input = field.querySelector('input, textarea, select');
                        if (input) {
                            input.focus();
                            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }
                return;
            }


            /* ----- Create request ----- */

            const request = {

                requestId:
                    "CQ" + Date.now(),

                customer: {

                    name: name,

                    email: email,

                    phone: phone
                },

                idea: {

                    title: title,

                    description: description,

                    category: categoryEl ? categoryEl.value : "",

                    colour:
                        document.querySelector(
                            "#custom-colour"
                        ).value.trim(),

                    size:
                        document.querySelector(
                            "#custom-size"
                        ).value.trim(),

                    quantity: quantity,

                    budget:
                        document.querySelector(
                            "#custom-budget"
                        ).value,

                    notes:
                        document.querySelector(
                            "#custom-notes"
                        ).value.trim(),

                    images:
                        selectedImages
                },

                status:
                    "Submitted",

                date:
                    new Date().toISOString()
            };


            /* ----- Save requests ----- */

            const existingRequests =
                JSON.parse(
                    localStorage.getItem(
                        "quirkzyCustomRequests"
                    )
                ) || [];


            existingRequests.push(request);


            localStorage.setItem(
                "quirkzyCustomRequests",
                JSON.stringify(
                    existingRequests
                )
            );


            /* ----- Success ----- */

            customSuccess.classList.add(
                "show"
            );
        }
    );


    /* ---------- Success → Home ---------- */

    if (customSuccessHome) {

        customSuccessHome.addEventListener(
            "click",
            function () {

                window.location.href =
                    "index.html";
            }
        );
    }

}


/* =========================================================
   END OF QUIRKZY MASTER SCRIPT
   ========================================================= */
