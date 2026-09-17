import { css } from "@emotion/react";
import { useState } from "react";
import { useQuery } from "react-query";
import { corsUrl } from "./query";

const BASE_GODFAT_URL = "https://bc.godfat.org/";

export type BannerSelectOption = {
  groupLabel: string;
  options: {
    value: string;
    label: string;
  }[];
};

const parseBannersFromHtml = (html: Document): BannerSelectOption[] => {
  const eventSelect = html.getElementById("event_select");
  if (!eventSelect) return [];

  const results = [];
  for (const child of eventSelect.children) {
    // The select also has bare <option> siblings for pagination
    // ("Previous page...", "Next page...") and occasionally a
    // "(Select an event here)" placeholder. Only real <optgroup>
    // elements are actual banner groups.
    if (child.tagName !== "OPTGROUP") {
      continue;
    }
    const optGroup = child as HTMLOptGroupElement;
    if (optGroup.label === "Custom:") {
      continue;
    }

    results.push({
      groupLabel: optGroup.label,
      options: Array.from(optGroup.children).map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).text,
      })),
    });
  }

  return results;
};

const hasNextPage = (html: Document): boolean =>
  html.getElementById("event_select")?.querySelector(
    'option[value="next_page"]'
  ) != null;

const godfatPageUrl = (eventPage: number) => {
  const url = new URL(BASE_GODFAT_URL);
  // 12/03/2024: For some reason corsproxy is caching an old version of
  // the base godfat page. As a temporary workaround, appending a fixed seed
  // of 1 to bust the cache. If issue persists, could consider generating
  // a random fixed seed instead.
  url.searchParams.set("seed", "1");
  if (eventPage > 1) {
    url.searchParams.set("event_page", eventPage.toString());
  }
  return url.toString();
};

export const useGodfatBanners = () => {
  const [eventPage, setEventPage] = useState(1);

  const bannerQuery = useQuery({
    queryKey: ["godfat-banners", eventPage],
    queryFn: async () => {
      const response = await fetch(corsUrl(godfatPageUrl(eventPage)));
      const dataText = await response.text();
      const dataDom = new DOMParser().parseFromString(dataText, "text/html");
      return {
        banners: parseBannersFromHtml(dataDom),
        hasNextPage: hasNextPage(dataDom),
      };
    },
    staleTime: Infinity,
    // Keeps showing the previous page's data (and keeps the rest of the
    // app mounted) while the next page loads, instead of resetting to a
    // loading state on every page change.
    keepPreviousData: true,
  });

  return {
    isLoading: bannerQuery.isLoading,
    isError: bannerQuery.isError,
    isChangingPage: bannerQuery.isFetching,
    banners: bannerQuery.data?.banners ?? [],
    eventPage,
    hasPrevPage: eventPage > 1,
    hasNextPage: bannerQuery.data?.hasNextPage ?? false,
    goToPrevPage: () => setEventPage((page) => Math.max(1, page - 1)),
    goToNextPage: () => setEventPage((page) => page + 1),
  };
};

export const isGodfatUrl = (url: string) => {
  try {
    return new URL(url).hostname === "bc.godfat.org";
  } catch (_) {
    return false;
  }
};

export const urlInputToGodfatUrl = ({
  selectedBanner,
  numFutureUbers,
}: {
  selectedBanner: string;
  numFutureUbers: number;
}) => {
  const baseUrl = new URL(BASE_GODFAT_URL);
  baseUrl.searchParams.set("ubers", numFutureUbers.toString());
  baseUrl.searchParams.set("event", selectedBanner);
  return baseUrl.toString();
};

export const augmentGodfatUrlWithGlobalConfig = ({
  startingUrl,
  seed,
  count,
}: {
  startingUrl: string;
  seed: string;
  count: number;
}) => {
  const url = new URL(startingUrl);
  url.searchParams.set("seed", seed);
  url.searchParams.set("count", count.toString());
  return url.toString();
};

export const sanitizeGodfatUrl = ({
  startingUrl,
  banners,
}: {
  startingUrl: string;
  banners: BannerSelectOption[];
}) => {
  const url = new URL(startingUrl);

  // Godfat strips params from the URL for default values, see
  // https://gitlab.com/godfat/battle-cats-rolls/-/blob/master/lib/battle-cats-rolls/route.rb?ref_type=heads#L468
  const firstNonPlatBanner =
  banners
    .flatMap((group) => group.options)
    .find(
      (o) =>
        !o.label.toLowerCase().includes("platinum capsules") &&
        !o.label.toLowerCase().includes("legend capsules")
    )?.value || "";

  const DELETE_VALUES = {
    seed: "0",
    lang: "en",
    name: "0",
    theme: "",
    count: "100",
    find: "0",
    last: "0",
    force_guaranteed: "0",
    ubers: "0",
    o: "",
    event: firstNonPlatBanner,
  };

  for (const [key, value] of Object.entries(DELETE_VALUES)) {
    if (url.searchParams.has(key) && url.searchParams.get(key) === value) {
      url.searchParams.delete(key);
    }
  }

  // The query params must be sorted in this exact order, otherwise we get 302'd which messes with the CORS proxy
  // See https://gitlab.com/godfat/battle-cats-rolls/-/blob/master/lib/battle-cats-rolls/route.rb?ref_type=heads#L428-436
  const CORRECT_ORDER_PARAMS = [
    "seed",
    "last",
    "event",
    "custom",
    "rate",
    "c_rare",
    "c_supa",
    "c_uber",
    "level",
    "lang",
    "version",
    "name",
    "theme",
    "count",
    "find",
    "no_guaranteed",
    "force_guaranteed",
    "ubers",
    "details",
    "hide_wave",
    "sum_no_wave",
    "dps_no_critical",
    "o",
  ];

  const updatedParams = [];
  for (const param of CORRECT_ORDER_PARAMS) {
    if (url.searchParams.has(param)) {
      const value = url.searchParams.get(param);
      updatedParams.push([`${param}=${value}`]);
    }
  }
  const sortedUpdatedParams = `/?${updatedParams.join("&")}`;
  return `${url.origin}${sortedUpdatedParams}`;
};

export const urlToRareCatQueryUrl = ({
  url,
  banners,
}: {
  url: string;
  banners: BannerSelectOption[];
}) => {
  // A rare cat query URL is a query with seed=1, details=true, and the event from the original URL.
  const searchParams = new URL(url).searchParams;
  const event = searchParams.get("event");
  const rareCatQueryUrl = new URL(BASE_GODFAT_URL);
  rareCatQueryUrl.searchParams.set("seed", "1");
  rareCatQueryUrl.searchParams.set("details", "true");
  if (event) {
    rareCatQueryUrl.searchParams.set("event", event);
    if (event === "custom") {
      const custom = searchParams.get("custom");
      const rate = searchParams.get("rate");
      rareCatQueryUrl.searchParams.set("custom", custom || "");
      rareCatQueryUrl.searchParams.set("rate", rate || "");
    }
  }
  return sanitizeGodfatUrl({
    startingUrl: rareCatQueryUrl.toString(),
    banners,
  });
};
