const { existsSync, readFileSync } = require('fs')
const { resolve, dirname } = require('path')

const cwd = process.cwd()
const paths = {
  cwd,
  modules: resolve(cwd, 'node_modules'),
}

/** Paths used by preprocessors to resolve @imports */
exports.getIncludePaths = fromFilename =>
  [
    paths.cwd,
    fromFilename.length && dirname(fromFilename),
    paths.modules,
  ].filter(Boolean)

exports.isFn = maybeFn => typeof maybeFn === 'function'

exports.isPromise = maybePromise =>
  Promise.resolve(maybePromise) === maybePromise

exports.getSrcContent = (rootFile, path) =>
  readFileSync(resolve(dirname(rootFile), path)).toString()

exports.parseXMLAttrString = unparsedAttrStr => {
  unparsedAttrStr = unparsedAttrStr.trim()
  return unparsedAttrStr.length > 0
    ? unparsedAttrStr.split(' ').reduce((acc, entry) => {
        const [key, value] = entry.split('=')
        acc[key] = value.replace(/['"]/g, '')
        return acc
      }, {})
    : {}
}

const LANG_DICT = new Map([
  ['sass', 'scss'],
  ['styl', 'stylus'],
  ['js', 'javascript'],
  ['coffee', 'coffeescript'],
])

exports.appendLanguageAliases = entries =>
  entries.forEach(entry => LANG_DICT.set(...entry))

exports.getLanguage = (attributes, defaultLang) => {
  let lang

  if (attributes.src) {
    lang = attributes.src.match(/\.([^/.]+)$/)
    lang = lang ? lang[1] : defaultLang
  } else {
    lang = (attributes.type || attributes.lang || defaultLang).replace(
      'text/',
      '',
    )
  }

  return LANG_DICT.get(lang) || lang
}

const preprocessorModules = {}

exports.runPreprocessor = (lang, maybeFn, content, filename) => {
  if (typeof maybeFn === 'function') {
    return maybeFn(content, filename)
  }

  const preprocessOpts =
    maybeFn && maybeFn.constructor === Object ? maybeFn : undefined

  try {
    preprocessorModules[lang] =
      preprocessorModules[lang] || require(`./langs/${lang}.js`)
    return preprocessorModules[lang](content, filename, preprocessOpts)
  } catch (e) {
    throw new Error(
      `[svelte-preprocess] Error processing '${lang}'. Message:\n${e.message}`,
    )
  }
}

exports.findPackageJson = function(startDir) {
  let dir
  let nextDir = startDir

  do {
    dir = nextDir
    const pkgfile = resolve(dir, 'package.json')

    if (existsSync(pkgfile)) {
      return {
        filename: pkgfile,
        data: JSON.parse(readFileSync(pkgfile)),
      }
    }
    nextDir = resolve(dir, '..')
  } while (dir !== nextDir)

  return null
}
