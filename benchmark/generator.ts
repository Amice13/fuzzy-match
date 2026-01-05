const letters = 'йцукенгшщзхъъфывапролджэячсмитьбю'

const getRandomLetter = (): string => letters[Math.floor(Math.random() * (letters.length - 1))]
const getRandomElement = (elements: string[]): string => elements[Math.floor(Math.random() * (elements.length - 1))]

const randomRemove = (text: string): string => {
  const index = Math.floor(Math.random() * text.length)
  text = text.slice(0, index) + text.slice(index + 1)
  return text
}

const randomReplace = (text: string): string => {
  const index = Math.floor(Math.random() * text.length)
  text = text.slice(0, index) + getRandomLetter() + text.slice(index + 1)
  return text
}

const randomMutate = (text: string): string => {
  const index1 = Math.floor(Math.random() * text.length)
  const index2 = Math.floor(Math.random() * text.length)
  const letter1 = text[index1]
  const letter2 = text[index2]
  text = text.slice(0, index1) + letter2 + text.slice(index1 + 1)
  text = text.slice(0, index2) + letter1 + text.slice(index2 + 1)
  return text
}

const operations = [randomRemove, randomReplace, randomMutate]

const spoilText = (text: string, distance: number): string => {
  if (distance === 0) return text
  for (const _ of Array(distance).fill(1)) { // eslint-disable-line
    const operation = operations[Math.floor(Math.random() * operations.length)]
    text = operation(text)
  }
  return text
}

export const getLookupData = (arr: string[], n: number): Array<Record<string, string>> => {
  return Array.from({ length: n }, () => {
    const source = getRandomElement(arr)
    const target = spoilText(source, Math.floor(Math.random() * 3 + 1))
    return { source, target }
  })
}

export function generateStrings (count: number, minLength = 4, maxLength = 8): string[] {
  const vowels = 'аеєиіїоуюяAEЄИІЇOУЮЯ'
  const consonants = 'бвгґджзйклмнпрстфхцчшщьБВГҐДЖЗЙКЛМНПРСТФХЦЧШЩЬ'
  const result: string[] = []

  const getRandom = (str: string) => str[Math.floor(Math.random() * str.length)]

  while (result.length < count) {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
    let word = ''
    let useVowel = Math.random() < 0.5

    for (let i = 0; i < length; i++) {
      word += useVowel ? getRandom(vowels) : getRandom(consonants)
      useVowel = !useVowel
    }

    if (!result.includes(word)) {
      result.push(word)
    }
  }
  return result
}
