/** @jsx jsx */
import React, { useRef, useState } from "react";
import { jsx, css } from "@emotion/react";

import ConfigContainer from "./ConfigContainer";
import TracksContainer from "./TracksContainer";
import { Typography } from "@mui/material";
import { useGodfatBanners } from "./utils/godfat";
import {
  useQueryParamLinkedString,
  useStorageLinkedString,
} from "./utils/config";
import { OutputEntry } from "./utils/output";
import PlannedOutputModal from "./PlannedOutputModal";
import VersionUpdateModal from "./VersionUpdateModal";

export type BannerData = {
  label: string;
  url: string;
};

export type ConfigData = {
  bannerData: BannerData[];
};

const globalCss = css`
  margin: 0;
  font-family: "Roboto", "Helvetica", "Arial", sans-serif;
  font-weight: 400;
  font-size: 0.875rem;
  line-height: 1.43;
  letter-spacing: 0.01071em;

  table {
    border-collapse: collapse;
  }
  table,
  td {
    white-space: nowrap;
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  th {
    border: 1px solid black;
    font-weight: bold;
  }

  td:empty::after {
    content: "\\00a0";
  }
`;

export default function Page() {
  // This is modified in TracksContainer when clicking to update seed, so it's pulled out to this level
  const [seed, setSeedWithOptionalReload] = useQueryParamLinkedString("seed");
  const setSeedWithReload = (seed: string) =>
    setSeedWithOptionalReload(seed, true);

  const [mode, setMode] = useStorageLinkedString("mode");
  const [selectedCell, setSelectedCell] = useState("");
  const resetSelectedCell = () => setSelectedCell("");
  const [plannedCells, setPlannedCells] = useState<string[]>([]);
  const addPlannedCell = (cell: string) => {
    setPlannedCells((plannedCells) => [...plannedCells, cell]);
  };
  const undoPlannedCell = () =>
    setPlannedCells((plannedCells) => plannedCells.slice(0, -1));
  const resetPlannedCells = () => setPlannedCells([]);
  // This was causing an infinite loop as state, since each rerender would set this to a new array
  // (even if the array is equivalent). We're probably okay just using a ref, lol
  const plannedOutputRef = useRef<OutputEntry[]>([]);
  const [plannedOutputModalOpen, setPlannedOutputModalOpen] = useState(false);
  const openPlannedOutputModal = () => setPlannedOutputModalOpen(true);
  const closePlannedOutputModal = () => setPlannedOutputModalOpen(false);

  const [configData, setConfigData] = useState<ConfigData>({
    bannerData: [],
  });

    const {
    isLoading,
    isError,
    isChangingPage,
    banners,
    eventPage,
    hasPrevPage,
    hasNextPage,
    goToPrevPage,
    goToNextPage,
  } = useGodfatBanners();

  if (isLoading) {
    return <Typography variant="h5">Loading banner data...</Typography>;
  }
  if (isError) {
    return <Typography variant="h5">Error fetching banner data!</Typography>;
  }

  return (
    <div css={globalCss}>
      <VersionUpdateModal />
      <PlannedOutputModal
        plannedOutputRef={plannedOutputRef}
        open={plannedOutputModalOpen}
        closePlannedOutputModal={closePlannedOutputModal}
      />
      <ConfigContainer
        banners={banners}
        eventPage={eventPage}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        isChangingPage={isChangingPage}
        goToPrevPage={goToPrevPage}
        goToNextPage={goToNextPage}
        setConfigData={setConfigData}
        seed={seed}
        setSeedWithOptionalReload={setSeedWithOptionalReload}
        mode={mode}
        setMode={setMode}
        resetSelectedCell={resetSelectedCell}
        resetPlannedCells={resetPlannedCells}
        undoPlannedCell={undoPlannedCell}
        openPlannedOutputModal={openPlannedOutputModal}
      />
      <TracksContainer
        plannedCells={plannedCells}
        addPlannedCell={addPlannedCell}
        resetPlannedCells={resetPlannedCells}
        banners={banners}
        configData={configData}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        setSeed={setSeedWithReload}
        mode={mode}
        plannedOutputRef={plannedOutputRef}
      />
    </div>
  );
}
