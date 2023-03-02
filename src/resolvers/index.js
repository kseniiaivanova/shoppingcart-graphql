const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  readJsonFile,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError, printType, isNonNullType } = require("graphql");
const crypto = require("crypto");
const axios = require("axios").default;

const shoppingCartsDirectory = path.join(
  __dirname,
  "..",
  "data",
  "shoppingcarts"
);

const itemDirectory = path.join(__dirname, "..", "data", "items");

exports.resolvers = {
  Query: {
    getShoppingCartById: async (_, args) => {
      const shoppingCartId = args.shoppingCartId;

      const shoppingCartsFilePath = path.join(
        shoppingCartsDirectory,
        `${shoppingCartId}.json`
      );

      const shoppingCartsExists = await fileExists(shoppingCartsFilePath);
      if (!shoppingCartsExists)
        return new GraphQLError("That shopping cart does not exist");

      const shoppingCartsData = await fsPromises.readFile(
        shoppingCartsFilePath,
        {
          encoding: "utf-8",
        }
      );
      const data = JSON.parse(shoppingCartsData);

      return data;
    },

    getItemById: async (_, args) => {
      const itemId = args.itemId;
      const itemFilePath = path.join(itemDirectory, `${itemId}.json`);
      const itemExists = await fileExists(itemFilePath);
      if (!itemExists) {
        return new GraphQLError("That item does not exist");
      }
      const itemData = await fsPromises.readFile(itemFilePath, {
        encoding: "utf-8",
      });
      const data = JSON.parse(itemData);
      return data;
    },
  },
  Mutation: {
    createItem: async (_, args) => {
      if (args.name.length === 0)
        return new GraphQLError("Name must be at least 1 character long");

      const newItem = {
        id: crypto.randomUUID(),
        name: args.name,
        description: args.description,
        price: args.price,
      };

      let filePath = path.join(itemDirectory, `${newItem.id}.json`);

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newItem.id);
        if (exists) {
          newItem.id = crypto.randomUUID();
          filePath = path.join(itemDirectory, `${newItem.id}.json`);
        }
        idExists = exists;
      }

      await fsPromises.writeFile(filePath, JSON.stringify(newItem));

      return newItem;
    },

    createCart: async (_, args) => {
      const newshoppingCart = {
        id: crypto.randomUUID(),
        total: args.input.total || 0,
        items: [],
      };

      let filePath = path.join(
        shoppingCartsDirectory,
        `${newshoppingCart.id}.json`
      );

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newshoppingCart.id);
        if (exists) {
          newshoppingCart.id = crypto.randomUUID();
          filePath = path.join(itemDirectory, `${newshoppingCart.id}.json`);
        }
        idExists = exists;
      }

      await fsPromises.writeFile(filePath, JSON.stringify(newshoppingCart));

      return newshoppingCart;
    },

    updateItem: async (_, args) => {
      const { id, name, description, price } = args.input;

      const filePath = path.join(itemDirectory, `${id}.json`);

      const itemExists = await fileExists(filePath);
      if (!itemExists)
        return new GraphQLError("That shoppingCarts does not exist");

      const updatedItem = {
        id,
        name,
        description,
        price,
      };

      await fsPromises.writeFile(filePath, JSON.stringify(updatedItem));

      return updatedItem;
    },

    addToCart: async (_, args) => {
      const itemId = args.itemId;
      const shoppingCartId = args.cartId;
      // Create a variable holding the file path (from computer root directory) to the shoppingCarts
      // file we are looking for
      const itemFilePath = path.join(itemDirectory, `${itemId}.json`);
      const shoppingCartFilePath = path.join(
        shoppingCartsDirectory,
        `${shoppingCartId}.json`
      );

      // Check if the requested shoppingCarts actually exists
      const shoppingCartsExists = await fileExists(shoppingCartFilePath);
      // If shoppingCarts does not exist return an error notifying the user of this
      if (!shoppingCartsExists)
        return new GraphQLError("That shoppingCarts does not exist");

      const itemExists = await fileExists(itemFilePath);
      if (!itemExists) {
        return new GraphQLError("That item does not exist");
      }

      // Read the shoppingCarts file; data will be returned as a JSON string
      const itemsData = JSON.parse(
        await fsPromises.readFile(itemFilePath, { encoding: "utf-8" })
      );

      let cartData = JSON.parse(
        await fsPromises.readFile(shoppingCartFilePath, { encoding: "utf-8" })
      );

      console.log(cartData);

      const newItem = {
        id: itemsData.id,
        name: itemsData.name,
        description: itemsData.description,
        price: itemsData.price,
      };

      cartData.items.push(newItem);
      cartData.total = 0;
      for (let i = 0; i < cartData.items.length; i++) {
        cartData.total += cartData.items[i].price || 0;

        console.log(cartData);
        console.log()
      }

      // Parse the returned JSON shoppingCarts data into a JS object
      //const cart = JSON.parse(cartData)
      await fsPromises.writeFile(
        shoppingCartFilePath,
        JSON.stringify(cartData)
      );

      return cartData;
    },

    removeFromCart: async (_, args) => {
      const itemId = args.itemId;
      const cartId = args.cartId;

      const cartFilePath = path.join(shoppingCartsDirectory, `${cartId}.json`);
      const itemFilePath = path.join(itemDirectory, `${itemId}.json`);

      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const itemExists = await fileExists(itemFilePath);

      if (!itemExists) return new GraphQLError("That item does not exist");

      let cartData = JSON.parse(
        await fsPromises.readFile(cartFilePath, { encoding: "utf-8" })
      );

      success = false;

      for (let i = 0; i < cartData.items.length; i++) {
        if (itemId === cartData.items[i].id && success === false) {
          cartData.items.splice(i, 1);
          cartData.total;
          success = true;
        }
      }

      cartData.total = 0;
      for (let i = 0; i < cartData.items.length; i++) {
        cartData.total += cartData.items[i].price;
      }

      await fsPromises.writeFile(cartFilePath, JSON.stringify(cartData));
      
      console.log(cartData)
      return cartData;

     
    },

    deleteShoppingCart: async (_, args) => {
      const shoppingCartId = args.shoppingCartId;
      const filePath = path.join(
        shoppingCartsDirectory,
        `${shoppingCartId}.json`
      );
      const shoppingCartExists = await fileExists(filePath);
      if (!shoppingCartExists) {
        return new GraphQLError("That cart does not exist");
      }
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: shoppingCartId,
          success: false,
        };
      }
      return {
        deletedId: shoppingCartId,
        success: true,
      };
    },
  },
};
