/** @jsx jsx */
import React, {
  Fragment,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BannerSelectOption,
  augmentGodfatUrlWithGlobalConfig,
  sanitizeGodfatUrl,
} from "./utils/godfat";
import UrlInput from "./UrlInput";
import { jsx } from "@emotion/react";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import styled from "@emotion/styled";
import { BannerData, ConfigData } from "./Page";
import {
  useStorageLinkedBoolean,
  useStorageLinkedInputs,
  useStorageLinkedNumber,
  useStorageLinkedString,
} from "./utils/config";
import { OutputEntry } from "./utils/output";
import {
  Assignment,
  ContentPasteGo,
  Delete,
  DeleteForever,
  Undo,
} from "@mui/icons-material";

// @ts-expect-error
import { useIsVisible } from "react-is-visible";

const generateKey = () => Math.random().toString(36).substring(7);

const Row = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
  margin: 10px 0;
`;

export default function ConfigContainer({
  banners,
  eventPage,
  hasPrevPage,
  hasNextPage,
  isChangingPage,
  goToPrevPage,
  goToNextPage,
  setConfigData,
  seed,
  setSeedWithOptionalReload,
  mode,
  setMode,
  resetSelectedCell,
  resetPlannedCells,
  undoPlannedCell,
  openPlannedOutputModal,
}: {
  banners: BannerSelectOption[];
  eventPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  isChangingPage: boolean;
  goToPrevPage: () => void;
  goToNextPage: () => void;
  setConfigData: (data: ConfigData) => void;
  seed: string;
  setSeedWithOptionalReload: (seed: string, reload: boolean) => void;
  mode: string;
  setMode: (mode: string) => void;
  resetSelectedCell: () => void;
  resetPlannedCells: () => void;
  undoPlannedCell: () => void;
  openPlannedOutputModal: () => void;
}) {
  const planningModeControlsRef = useRef<HTMLDivElement>(null);
  const planningModeControlsIsVisible = useIsVisible(planningModeControlsRef);

  const [count, setCount] = useStorageLinkedNumber("count");
  const [inputs, setInputs] = useStorageLinkedInputs("inputKeys");
  const [userInputSeed, setUserInputSeed] = useState(seed);
  const userInputSeedIsValid =
    !isNaN(Number(userInputSeed)) && Number(userInputSeed) !== 0;

  const addNewInput = () => {
    setInputs((inputs) => [
      ...inputs,
      { key: generateKey(), value: { label: "", url: "" } },
    ]);
  };

  const removeInput = (key: string) => {
    setInputs((inputs) => inputs.filter((input) => input.key !== key));
  };

  const setInputValue = (key: string, value: BannerData) => {
    setInputs((inputs) => {
      const index = inputs.findIndex((input) => input.key === key);
      return [
        ...inputs.slice(0, index),
        { key, value },
        ...inputs.slice(index + 1),
      ];
    });
  };

  const onSubmit = () => {
    setSeedWithOptionalReload(userInputSeed, false);
    const bannerData = inputs.map(({ value }, index) => {
      const augmentedUrl = augmentGodfatUrlWithGlobalConfig({
        startingUrl: value.url,
        // Take note of this line - seed might not be synced with userInputSeed
        // until the next render cycle, so we use userInputSeed directly instead
        seed: userInputSeed,
        count,
      });
      const sanitizedUrl = sanitizeGodfatUrl({
        startingUrl: augmentedUrl,
        banners,
      });
      return {
        label: value.label || `Banner ${index + 1}`,
        url: sanitizedUrl,
      };
    });
    setConfigData({ bannerData });
  };

  // Hack: the first render is doesn't have the inputs yet, only the input keys
  // The second render will be triggered instantly by the inputs instantiating themselves
  const numRendersRef = useRef(0);
  numRendersRef.current += 1;
  if (numRendersRef.current === 2 && seed) {
    try {
      onSubmit();
    } catch (e) {}
  }

  return (
    <Fragment>
      {planningModeControlsRef.current &&
        !planningModeControlsIsVisible &&
        mode === "plan" && (
          <div
            css={{
              position: "fixed",
              bottom: "8px",
              right: "8px",

              display: "flex",
              flexDirection: "column",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid rgba(0, 0, 0, 0.23)",
              boxShadow: "0px 0px 6px 2px rgba(0, 0, 0, 0.23)",
              backgroundColor: "white",
            }}
          >
            <Typography css={{ color: "rgba(0, 0, 0, 0.6)" }} variant="caption">
              Planning Mode Controls
            </Typography>
            <div css={{ display: "flex", gap: "12px" }}>
              <Button
                startIcon={<Undo />}
                variant="outlined"
                size="small"
                css={{ height: "fit-content" }}
                onClick={() => undoPlannedCell()}
              >
                Undo
              </Button>
              <Button
                startIcon={<Delete />}
                variant="outlined"
                size="small"
                color="error"
                css={{ height: "fit-content" }}
                onClick={() => resetPlannedCells()}
              >
                Reset
              </Button>
              <Button
                startIcon={<ContentPasteGo />}
                variant="outlined"
                size="small"
                color="success"
                css={{
                  height: "fit-content",
                }}
                onClick={() => openPlannedOutputModal()}
              >
                Output
              </Button>
            </div>
          </div>
        )}
      <div>
        <Row>
          <TextField
            id="seed-input"
            size="small"
            label="Gacha seed"
            placeholder="123456..."
            variant="outlined"
            value={userInputSeed}
            onChange={(event) => {
              setUserInputSeed(event.target.value);
            }}
            error={!userInputSeedIsValid}
          />
          <FormControl>
            <InputLabel id="count-select" shrink>
              Count
            </InputLabel>
            <Select
              notched
              native
              size="small"
              labelId="count-select"
              label="Count"
              value={count}
              onChange={(event) => {
                setCount(event.target.value as number);
              }}
            >
              <option key={"100"} value={100}>
                100
              </option>
              <option key={"200"} value={200}>
                200
              </option>
              <option key={"500"} value={500}>
                500
              </option>
              <option key={"999"} value={999}>
                999
              </option>
            </Select>
          </FormControl>
        </Row>
        <Row>
          <div
            css={{
              display: "flex",
              flexDirection: "column",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid rgba(0, 0, 0, 0.23)",
            }}
            ref={planningModeControlsRef}
          >
            <Typography css={{ color: "rgba(0, 0, 0, 0.6)" }} variant="caption">
              Planning Mode
            </Typography>
            <div css={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    css={{ marginLeft: "4px" }}
                    checked={mode === "plan"}
                    onChange={() => {
                      if (mode === "plan") {
                        setMode("simulate");
                        resetPlannedCells();
                      } else {
                        setMode("plan");
                        resetSelectedCell();
                      }
                    }}
                  />
                }
                label={`${mode === "plan" ? "ON" : "OFF"}`}
              />
              {mode === "plan" && (
                <Fragment>
                  <Button
                    startIcon={<Undo />}
                    variant="outlined"
                    size="small"
                    css={{ marginLeft: "12px", height: "fit-content" }}
                    onClick={() => undoPlannedCell()}
                  >
                    Undo
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    variant="outlined"
                    size="small"
                    color="error"
                    css={{ marginLeft: "12px", height: "fit-content" }}
                    onClick={() => resetPlannedCells()}
                  >
                    Reset
                  </Button>
                  <Button
                    startIcon={<ContentPasteGo />}
                    variant="outlined"
                    size="small"
                    color="success"
                    css={{
                      marginLeft: "12px",
                      marginRight: "4px",
                      height: "fit-content",
                    }}
                    onClick={() => openPlannedOutputModal()}
                  >
                    Output
                  </Button>
                </Fragment>
              )}
            </div>
            <Typography css={{ color: "rgba(0, 0, 0, 0.6)" }} variant="caption">
              {mode === "plan" ? (
                <i>
                  (clicking <strong>striped</strong> cells will{" "}
                  <strong>continue the chain</strong>, also{" "}
                  <strong>disables clicking cat names</strong>)
                </i>
              ) : (
                <i>
                  (clicking <strong>any</strong> cells will{" "}
                  <strong>simulate rolls</strong>)
                </i>
              )}
            </Typography>
          </div>
        </Row>
        <Row>
          <Button variant="outlined" onClick={addNewInput}>
            Add new track
          </Button>
        </Row>
        {inputs.map(({ key }) => (
          <UrlInput
            key={key}
            id={key}
            bannerSelectOptions={banners}
            removeSelf={() => removeInput(key)}
            setSelfValue={(value) => setInputValue(key, value)}
          />
        ))}
        {inputs.length > 0 && userInputSeedIsValid && (
          <Row>
            <Button
              variant="contained"
              disableElevation
              onClick={() => onSubmit()}
            >
              Submit / Update
            </Button>
          </Row>
        )}
      </div>
    </Fragment>
  );
}
