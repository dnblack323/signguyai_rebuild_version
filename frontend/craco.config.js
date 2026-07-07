function skipRootAbsoluteCssUrls(rules) {
  rules.forEach((rule) => {
    if (rule.oneOf) {
      skipRootAbsoluteCssUrls(rule.oneOf);
    }
    if (Array.isArray(rule.use)) {
      rule.use.forEach((useEntry) => {
        const loaderPath = typeof useEntry === "string" ? useEntry : useEntry.loader;
        if (loaderPath && loaderPath.includes("css-loader") && !loaderPath.includes("postcss-loader")) {
          useEntry.options = {
            ...useEntry.options,
            url: {
              filter: (url) => !url.startsWith("/"),
            },
          };
        }
      });
    }
  });
}

function findOneOfRule(rules) {
  for (const rule of rules) {
    if (Array.isArray(rule.oneOf)) return rule.oneOf;
  }
  return null;
}

module.exports = {
  style: {
    postcss: {
      mode: "extends",
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      skipRootAbsoluteCssUrls(webpackConfig.module.rules);
      const oneOf = findOneOfRule(webpackConfig.module.rules);
      if (oneOf) {
        // Vite-style `?inline` CSS imports (e.g. wrap-lab.css?inline) expect the
        // raw CSS text as a plain string, not css-loader's CSS-module array export.
        oneOf.unshift({
          test: /\.css$/,
          resourceQuery: /inline/,
          type: "asset/source",
        });
      }
      return webpackConfig;
    },
  },
  devServer: {
    allowedHosts: "all",
  },
};
