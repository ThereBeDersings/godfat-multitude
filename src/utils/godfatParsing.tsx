export type CatData = {
  text: string;
  name: string;
  destinationRow: number;
  destinationTrack: string;
  href: string;
  backgroundType?: "selected" | "next";
  planBackgroundType?: "selected" | "next";
};

export type CatCell = {
  color: string;
  mainCat: CatData;
  altCat?: CatData;

  guaranteeColor: string;
  guaranteeMainCat?: CatData;
  guaranteeAltCat?: CatData;
};

const getColorFromClass = (className: string): string => {
  const COLOR_MAP = {
    rare: "white",
    owned: "lightcyan",
    supa_fest: "yellow",
    supa: "gold",
    uber_fest: "salmon",
    uber: "red",
    legend_fest: "mediumslateblue",
    exclusive: "aqua",
    found: "lime",
    legend: "darkviolet",
  };

  // Cells no longer carry a bare rarity class (e.g. "uber"). Each cell now
  // gets a "minor_X" + "major_X" pair (see tacit.css's --minor/--major
  // split-gradient background). "major_" is this cell's dominant
  // rarity/status, so key off that instead.
  for (const classNameEntry of className.split(" ")) {
    if (classNameEntry.startsWith("major_")) {
      const rarity = classNameEntry.slice("major_".length);
      if (rarity in COLOR_MAP) {
        return COLOR_MAP[rarity as keyof typeof COLOR_MAP];
      }
    }
  }
  return "white";
};

const extractCatStringFromTd = (td: HTMLElement): string => {
  return td.textContent!.replace("🐾", "").replace("\n", "").trim();
};

const extractMovementDataFromCatString = (
  catString: string
): {
  text: string;
  name: string;
  destinationRow: number;
  destinationTrack: string;
} => {
  const splitCatString = catString.split(" ");
  const destination =
    splitCatString[0] === "<-"
      ? splitCatString[1]
      : splitCatString[splitCatString.length - 1];
  const destinationNoReroll = destination.replace("R", "");
  const destinationTrack = destinationNoReroll.slice(
    destinationNoReroll.length - 1
  );
  const destinationRow = parseInt(
    destinationNoReroll.slice(0, destinationNoReroll.length - 1),
    10
  );
  return {
    text: catString,
    name: catString
      .replace("<-", "")
      .replace("->", "")
      .replace(isNaN(destinationRow) ? "" : destination, "")
      .trim(),
    destinationRow,
    destinationTrack,
  };
};

export const extractCatsFromTable = (
  table: HTMLElement,
  track: "A" | "B"
): CatCell[] => {
  const trackA = track === "A";
  const res: CatCell[] = [];

  let numDataRows = 0;
  let numSkipRows = 0;
  let currentCatCell: CatCell | null = null;
  for (const row of table.getElementsByTagName("tr")) {
    const lastIndex = row.children.length - 1;

    const dataRowsDeterminer =
      row.children[trackA ? 0 : lastIndex].getAttribute("rowspan");
    const skipRowsDeterminer =
      row.children[trackA ? 1 : lastIndex - 1].getAttribute("rowspan");
    if (
      isNaN(Number(dataRowsDeterminer)) ||
      isNaN(Number(skipRowsDeterminer))
    ) {
      continue;
    }

    if (numSkipRows > 0) {
      // Skip this row
      numSkipRows--;
      numDataRows--;
    } else if (numDataRows > 0) {
      // Still have more data to read
      const normalCol = row.children[trackA ? 0 : lastIndex - 1];
      const guaranteeCol = row.children[trackA ? 1 : lastIndex];
      const normalColHref = normalCol.getElementsByTagName("a")[0]?.href;
      const guaranteeColHref = guaranteeCol.getElementsByTagName("a")[0]?.href;
      const data = extractCatStringFromTd(normalCol as HTMLElement);
      const guaranteeData = extractCatStringFromTd(guaranteeCol as HTMLElement);
      if (currentCatCell?.mainCat) {
        currentCatCell.altCat = {
          ...extractMovementDataFromCatString(data),
          href: normalColHref,
        };
        currentCatCell.guaranteeAltCat = {
          ...extractMovementDataFromCatString(guaranteeData),
          href: guaranteeColHref,
        };
      } else {
        currentCatCell = {
          color: getColorFromClass(normalCol.getAttribute("class")!),
          guaranteeColor: getColorFromClass(
            guaranteeCol.getAttribute("class")!
          ),
          mainCat: {
            ...extractMovementDataFromCatString(data),
            href: normalColHref,
          },
          guaranteeMainCat: {
            ...extractMovementDataFromCatString(guaranteeData),
            href: guaranteeColHref,
          },
        };
      }
      numDataRows--;
    } else {
      // Start a new data section, but don't read the current row (it's blank)
      if (currentCatCell) {
        res.push(currentCatCell);
        currentCatCell = null;
      }
      numDataRows = Number(dataRowsDeterminer) - 1;
      numSkipRows = Number(skipRowsDeterminer) - 1;
    }
  }
  if (currentCatCell) {
    res.push(currentCatCell);
  }

  return res;
};
