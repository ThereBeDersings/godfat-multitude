import React, { MutableRefObject, useEffect, useState } from "react";

import TrackContainer from "./TrackContainer";
import { ConfigData } from "./Page";
import { useQueries } from "react-query";
import { corsUrl } from "./utils/query";
import { Typography } from "@mui/material";
import { CatCell, CatData, extractCatsFromTable } from "./utils/godfatParsing";
import { BannerSelectOption, urlToRareCatQueryUrl } from "./utils/godfat";
import { desSelectedCell } from "./utils/cellSelection";
import {
  OutputEntry,
  OutputEntryGuarantee,
  OutputEntrySingle,
} from "./utils/output";

export type CellData = {
  row: string;
  target?: string;
};

type QueryData = {
  trackAs: CatCell[][];
  trackBs: CatCell[][];
};

const parseSeedFromHref = (href: string) => {
  return new URL(href).searchParams.get("seed") || "";
};

const handleCellSelection = ({
  mode,
  queryData,
  selectedCell,
  configData,
  rareCats,
  highlightNext,
}: {
  mode: string;
  queryData: QueryData;
  selectedCell: string;
  configData: ConfigData;
  rareCats: Set<string>;
  highlightNext: boolean;
}): OutputEntry => {
  const { bannerUrl, num, track, isMainCat, isGuaranteed } =
    desSelectedCell(selectedCell);

  const setCellBackground = (cell: CatData, type: "selected" | "next") => {
    if (!cell) {
      return;
    }
    if (mode === "simulate") {
      cell.backgroundType = type;
    } else if (mode === "plan") {
      cell.planBackgroundType = type;
    }
  };

  // Isolate the current banner and track
  const trackIndex = configData.bannerData.findIndex(
    (data) => data.url === bannerUrl
  );
  let currentTrackList =
    track === "A"
      ? queryData.trackAs[trackIndex]
      : queryData.trackBs[trackIndex];
  const outputEntry: OutputEntry = {
    bannerLabel: configData.bannerData[trackIndex].label,
  };
  const outputEntrySingle: Partial<OutputEntrySingle> = {};
  const outputEntryGuarantee: Partial<OutputEntryGuarantee> = {
    trackCatNames: [],
  };

  // Seed outputEntry with some initial values
  // If the cell is a guaranteed, highlight it and find the destination
  let guaranteedDestinationNum = null;
  let guaranteedDestinationTrack = null;
  if (isGuaranteed) {
    const currentCatCell = currentTrackList[num - 1];
    if (isMainCat) {
      setCellBackground(currentCatCell.guaranteeMainCat!, "selected");
      guaranteedDestinationNum =
        currentCatCell.guaranteeMainCat?.destinationRow;
      guaranteedDestinationTrack =
        currentCatCell.guaranteeMainCat?.destinationTrack;
      outputEntryGuarantee.guaranteeCatName =
        currentCatCell.guaranteeMainCat!.name;
      outputEntryGuarantee.nextSeed = parseSeedFromHref(
        currentCatCell.guaranteeMainCat!.href
      );
    } else {
      setCellBackground(currentCatCell.guaranteeAltCat!, "selected");
      guaranteedDestinationNum = currentCatCell.guaranteeAltCat?.destinationRow;
      guaranteedDestinationTrack =
        currentCatCell.guaranteeAltCat?.destinationTrack;
      outputEntryGuarantee.guaranteeCatName =
        currentCatCell.guaranteeAltCat!.name;
      outputEntryGuarantee.nextSeed = parseSeedFromHref(
        currentCatCell.guaranteeAltCat!.href
      );
    }
    outputEntryGuarantee.startNum = num;
    outputEntryGuarantee.startTrack = track;
    outputEntryGuarantee.nextNum = guaranteedDestinationNum;
    outputEntryGuarantee.nextTrack = guaranteedDestinationTrack;
  }

  // If not main cat, set lastCatName to a dupe to force the alt track
  let lastCatName = isMainCat ? "" : currentTrackList[num - 1].mainCat.name;
  let currentNum = num;
  let currentTrack = track;
  let numRolls = 0;
  while (true) {
    // Find the cat
    currentTrackList =
      currentTrack === "A"
        ? queryData.trackAs[trackIndex]
        : queryData.trackBs[trackIndex];
    const currentCatCell = currentTrackList[currentNum - 1];
    if (!currentCatCell) {
      break; // Probably went out of bounds
    }

    let currentCat;
    // Determine if it's a rare dupe
    const isRareDupe =
      rareCats.has(currentCatCell.mainCat.name) &&
      currentCatCell.mainCat.name === lastCatName;
    if (!isRareDupe) {
      lastCatName = currentCatCell.mainCat.name;

      if (!isGuaranteed) {
        outputEntrySingle.num = currentNum;
        outputEntrySingle.track = currentTrack;
      }

      currentNum += 1;
      currentCat = currentCatCell.mainCat;
    } else {
      lastCatName = currentCatCell.altCat!.name;

      if (!isGuaranteed) {
        outputEntrySingle.num = currentNum;
        outputEntrySingle.track = currentTrack;
      }

      currentNum = currentCatCell.altCat!.destinationRow;
      currentTrack = currentCatCell.altCat!.destinationTrack as "A" | "B";
      currentCat = currentCatCell.altCat!;
    }
    // Highlight the cat
    setCellBackground(currentCat, "selected");
    numRolls += 1;

    // Update outputEntry
    if (isGuaranteed) {
      outputEntryGuarantee.trackCatNames!.push(currentCat.name);
    } else {
      outputEntrySingle.catName = currentCat.name;
    }

    // Exit conditions
    if (isGuaranteed) {
      // Stop when: IF (ends on A) THEN (when we get to i-1B) ELSE IF (ends on B) THEN (when we get to iA)
      if (
        (guaranteedDestinationTrack === "A" &&
          currentNum + 1 === guaranteedDestinationNum &&
          currentTrack === "B") ||
        (guaranteedDestinationTrack === "B" &&
          currentNum === guaranteedDestinationNum &&
          currentTrack === "A")
      ) {
        break;
      } else {
        // Kinda hacky - just keep updating endNum/endTrack every loop until the stop condition
        outputEntryGuarantee.endNum = currentNum;
        outputEntryGuarantee.endTrack = currentTrack;
      }
    } else {
      // For non-guaranteed cells, just stop after one pull
      if (numRolls === 1) {
        outputEntrySingle.nextNum = currentNum;
        outputEntrySingle.nextTrack = currentTrack;
        outputEntrySingle.nextSeed = parseSeedFromHref(currentCat.href);
        break;
      }
    }
  }

  // Highlight the entire destination row
  if (highlightNext) {
    const nextCatNum = isGuaranteed ? guaranteedDestinationNum : currentNum;
    const nextCatTrack = isGuaranteed
      ? guaranteedDestinationTrack
      : currentTrack;
    const allTracks =
      nextCatTrack === "A" ? queryData.trackAs : queryData.trackBs;
    for (const track of allTracks) {
      const catCell = track[nextCatNum! - 1];
      if (catCell) {
        const isRareDupe =
          !isGuaranteed &&
          rareCats.has(catCell.mainCat.name) &&
          catCell.mainCat.name === lastCatName;
        if (!isRareDupe) {
          // Highlight the main and guaranteed main cats
          setCellBackground(catCell.mainCat, "next");
          setCellBackground(catCell.guaranteeMainCat!, "next");
        } else {
          // Highlight the alt and guaranteed alt cats
          setCellBackground(catCell.altCat!, "next");
          setCellBackground(catCell.guaranteeAltCat!, "next");
        }
      }
    }
  }

  if (isGuaranteed) {
    outputEntry.guarantee = outputEntryGuarantee as OutputEntryGuarantee;
  } else {
    outputEntry.single = outputEntrySingle as OutputEntrySingle;
  }
  return outputEntry;
};

export default function TracksContainer({
  canonicalBanners,
  configData,
  setSeed,
  selectedCell,
  setSelectedCell,
  plannedCells,
  addPlannedCell,
  resetPlannedCells,
  mode,
  plannedOutputRef,
}: {
  canonicalBanners: BannerSelectOption[];
  configData: ConfigData;
  setSeed: (seed: string) => void;
  selectedCell: string;
  setSelectedCell: (cell: string) => void;
  plannedCells: string[];
  addPlannedCell: (cell: string) => void;
  resetPlannedCells: () => void;
  mode: string;
  plannedOutputRef: MutableRefObject<OutputEntry[]>;
}) {
  const urls = configData.bannerData.map((data) => data.url);
  // We want to render tracks when the urls change, but we can't use urls in the dependency array since its
  // identity is different every rerender. Hence, we use the stringified version instead:
  const urlsButAsAString = urls.join("");

  const [parsedQueryData, setParsedQueryData] = useState<QueryData>({
    trackAs: [],
    trackBs: [],
  });
  const [rareCats, setRareCats] = useState(new Set<string>());

  const queries = useQueries(
    urls.map((url) => ({
      queryKey: [url],
      queryFn: () => fetch(corsUrl(url)),
      staleTime: Infinity,
    }))
  );
  const rareCatQueries = useQueries(
    urls.map((url) => {
      const rareCatQueryUrl = urlToRareCatQueryUrl({
        url,
        canonicalBanners,
      });
      return {
        queryKey: [rareCatQueryUrl],
        queryFn: () => fetch(corsUrl(rareCatQueryUrl)),
        staleTime: Infinity,
      };
    })
  );

  const allQueriesResolved =
    queries.every((query) => query.isFetched) &&
    rareCatQueries.every((query) => query.isFetched);

  useEffect(() => {
    (async () => {
      const res = {
        trackAs: [] as CatCell[][],
        trackBs: [] as CatCell[][],
      };
      const successfulQueries = queries.filter((query) => query.isSuccess);
      for (const query of successfulQueries) {
        const dataText = await query.data!.clone().text();
        const dataDom = new DOMParser().parseFromString(dataText, "text/html");
        const dataTable = dataDom.getElementsByTagName("table")[0]; // Godfat page is guaranteed to have one table
        const trackACats = extractCatsFromTable(dataTable, "A");
        const trackBCats = extractCatsFromTable(dataTable, "B");
        res.trackAs.push(trackACats);
        res.trackBs.push(trackBCats);
      }
      setParsedQueryData(res);

      const successfulRareCatQueries = rareCatQueries.filter(
        (query) => query.isSuccess
      );
      const rareCatSet = new Set<string>();
      for (const query of successfulRareCatQueries) {
        const dataText = await query.data!.clone().text();
        const dataDom = new DOMParser().parseFromString(dataText, "text/html");
        const dataDiv = dataDom.getElementsByClassName("information")[0]; // Details page is guaranteed to have one .information
        const catAnchors = dataDiv
          .getElementsByTagName("li")[0]
          .getElementsByTagName("a");
        for (const anchor of catAnchors) {
          rareCatSet.add(anchor.textContent!);
        }
      }
      setRareCats(rareCatSet);

      setSelectedCell("");
      resetPlannedCells();
    })();

    return () => {};
  }, [allQueriesResolved, urlsButAsAString]);

  if (!allQueriesResolved) {
    return <Typography variant="h5">Loading banner data...</Typography>;
  }
  if (
    parsedQueryData.trackAs.length === 0 ||
    parsedQueryData.trackBs.length === 0 ||
    configData.bannerData.length !== parsedQueryData.trackAs.length ||
    configData.bannerData.length !== parsedQueryData.trackBs.length
  ) {
    return <></>;
  }

  // Deep clone parsedQueryData, so changes don't get persisted on rerender
  const queryData: QueryData = JSON.parse(JSON.stringify(parsedQueryData));

  if (mode === "simulate") {
    if (selectedCell) {
      handleCellSelection({
        mode,
        queryData,
        selectedCell,
        configData,
        rareCats,
        highlightNext: true,
      });
    }
  } else if (mode === "plan") {
    if (plannedCells.length === 0) {
      // Set 1A as "next" to start off
      for (const trackList of queryData.trackAs) {
        trackList[0].mainCat.planBackgroundType = "next";
        if (trackList[0].guaranteeMainCat) {
          trackList[0].guaranteeMainCat.planBackgroundType = "next";
        }
      }
    } else {
      const selectionOutputs = [];
      for (const [index, plannedCell] of plannedCells.entries()) {
        const selectionOutput = handleCellSelection({
          mode,
          queryData,
          selectedCell: plannedCell,
          configData,
          rareCats,
          highlightNext: index === plannedCells.length - 1,
        });
        selectionOutputs.push(selectionOutput);
      }
      plannedOutputRef.current = selectionOutputs;
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          padding: "10px",
        }}
      >
        <TrackContainer
          track="A"
          configData={configData}
          cells={queryData.trackAs}
          setSeed={setSeed}
          setSelectedCell={setSelectedCell}
          addPlannedCell={addPlannedCell}
          mode={mode}
        />
        <TrackContainer
          track="B"
          configData={configData}
          cells={queryData.trackBs}
          setSeed={setSeed}
          setSelectedCell={setSelectedCell}
          addPlannedCell={addPlannedCell}
          mode={mode}
        />
      </div>
    </>
  );
}
