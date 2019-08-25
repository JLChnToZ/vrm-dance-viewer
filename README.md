![TypeScript and Three.js made easy](https://i.imgur.com/6We17Nm.png)

## Features

- **TypeScript** support
- **HTML** & **CSS** support
- Integrated **development server** with **live reload**
- **Source maps** in development mode
- **Optimized** and **minified** production build

## Setup

1. Clone the repository:
   ```
   $ git clone https://github.com/Joh4nnesB/threejs-typescript-webpack.git
   $ cd threejs-typescript-webpack
   ```
2. Install all required dependencies:
   ```
   $ npm install
   ```
3. Modify the `./package.json` file for your needs and delete the `./.git/` folder.

## Start the development server

```
$ npm run dev
```

Your web browser will automatically open the page [`http://localhost:8080/`](http://localhost:8080/) and you'll see a beautiful flying saucer.
When you edit, delete or re-create a file, the page is automatically reloaded.

## Build

```
$ npm run build
```

You'll find the output files in `./public/`

## License

The [`./assets/flying_saucer.glb`](https://github.com/Joh4nnesB/threejs-typescript-webpack/blob/master/assets/flying_saucer.glb) file by [Google](https://poly.google.com/user/4aEd8rQgKu2) from [Google Poly](https://poly.google.com/) is licensed by [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/legalcode) (modified).
Other files are licensed by [MIT](https://opensource.org/licenses/MIT)
