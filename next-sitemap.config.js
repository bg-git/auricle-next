/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.auricle.co.uk',
  generateRobotsTxt: true,
  trailingSlash: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/register',
          '/sign-in',
          '/cart',
          '/api/',
          '/studio/',
          '/admin/',
        ],
      },
    ],
  },
};
