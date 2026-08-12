export type ArtGuideStep = {
  title: string;
  instruction: string;
  tip?: string;
};

export type ArtGuideSteps = readonly [
  ArtGuideStep,
  ArtGuideStep,
  ArtGuideStep,
  ArtGuideStep,
];
