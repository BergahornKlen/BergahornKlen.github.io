'use strict'
/* global hexo */

const fs = require('hexo-fs')

const prepareQuery = (categories, parent) => {
  const query = {}

  if (parent) {
    query.parent = parent
  } else {
    query.parent = { $exists: false }
  }

  return categories.find(query).sort('name', 1).filter(cat => cat.length)
}

hexo.extend.helper.register('_list_categories', function (depth = 0) {
  // let hexo = this
  const categories = this.site.categories

  if (!categories || !categories.length) return ''

  const hierarchicalList = (level, parent) => {
    let result = ''

    prepareQuery(categories, parent).forEach((cat, i) => {
      let child

      if (level + 1 < depth) {
        child = hierarchicalList(level + 1, cat._id)
      }

      const catname = `<a itemprop="url" href="${this.url_for(cat.path)}">${cat.name}</a><small>( ${cat.length} )</small>`

      switch (level) {
        case 0:
          result += `<div><h2 class="item header">${catname}</h2>`
          break

        case 1:
          result += `<h3 class="item section">${catname}</h3>`
          break

        case 2:
          result += `<div class="item normal"><div class="title">${catname}</div></div>`
          break
      }

      if (child) {
        result += `${child}`
      }

      if (level === 0) {
        result += '</div>'
      }
    })

    return result
  }

  return hierarchicalList(0)
})

hexo.extend.helper.register('_categories', function () {
  // let hexo = this
  const categories = this.site.categories
  if (!categories || !categories.length) return ''

  const pangu = this.theme.pangu
    ? require('pangu')
    : {
        spacing: data => {
          return data
        }
      }

  const result = {}

  categories.forEach((cat, i) => {
    const child = prepareQuery(categories, cat._id)
    const cover = 'source/_posts' + cat.path.replace(this.config.category_dir, '') + 'cover.jpg'

    if (fs.existsSync(cover)) {
      const className = cat.slug.split('/')
      className.pop()
      cat.class = className.join(' ')
      cat.name = pangu.spacing(cat.name)

      if (child.length !== 0) {
        cat.child = child
      }

      result[cat._id] = cat
    }
  })

  return result
})

hexo.extend.helper.register('_category_prev', function (name) {
  // let hexo = this
  const categories = this.site.categories
  if (!categories || !categories.length) return ''

  let result = ''

  categories.find({ name }).forEach((current) => {
    if (current.parent) {
      categories.find({ _id: current.parent }).forEach((cat, i) => {
        result += `<a href="${this.url_for(cat.path)}">${cat.name}</a>`
      })
    }
  })

  return result
})

hexo.extend.helper.register('_category_posts', function (page) {
  // let hexo = this
  const categories = this.site.categories
  if (!categories || !categories.length || !page.categories || !page.categories.length) return ''

  let result = ''
  const cat = page.categories.toArray()

  categories.find({ _id: cat[cat.length - 1]._id }).forEach((category) => {
    if (category.posts) {
      category.posts.sort('date', 1).forEach((post) => {
        let current = ''
        if (post.path === page.path) {
          current = ' class="active"'
        }
        result += `<li ${current}><a href="${this.url_for(post.path)}" rel="bookmark" title="${post.title}">${post.title}</a></li>`
      })
    }
  })

  return result
})
