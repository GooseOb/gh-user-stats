export const getLangToColor = () =>
  fetch(
    "https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml",
  )
    .then((res) => res.text())
    .then((colorsRaw) => {
      const result: Record<string, string> = {};

      for (const item of colorsRaw.split(/\n(?=\S)/g)) {
        const nameMatch = /^(\S.*?):/.exec(item);
        const colorMatch = /color:\s*"(#\w{6}|\w+)"/.exec(item);
        if (nameMatch && colorMatch) {
          result[nameMatch[1]!.toLowerCase()] = colorMatch[1]!;
        }
      }

      return result;
    });
