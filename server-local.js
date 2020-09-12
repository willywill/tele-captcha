const app = require('./express/server');

const port = process.env.PORT || 8080;

// eslint-disable-next-line no-console
app.listen(port, () => console.log(`Application listening on port ${port}!`));
