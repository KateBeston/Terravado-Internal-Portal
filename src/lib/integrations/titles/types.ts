/* Land-titles integration shapes. Title particulars come from the state land
   registries (NSW LRS, Landgate WA, Titles Queensland, Land Use Victoria, etc.),
   reached in practice through an information broker (GlobalX / InfoTrack /
   Dye & Durham / CITEC). Every value carries its source and as-at. */
export interface TitleParticulars {
  address: string;
  state: string;
  titleReference?: string;   // e.g. 1/SP12345, Vol/Fol
  lotPlan?: string;          // lot / plan or lot / DP
  tenure?: string;           // Freehold / Leasehold / Strata / Community
  landArea?: number;         // m² from the plan
  councilLGA?: string;
  zoning?: string;
  registeredProprietor?: string;
  source: string;
  asAt: string;
  disclaimer: string;
}
