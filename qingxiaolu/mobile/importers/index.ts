import { FileImporter } from "./FileImporter";
import { QQZoneImporter, WechatMomentsImporter, WeiboImporter, YiyanImporter } from "./PlatformImporters";

export * from "./types";

export const importAdapters = [
  new WeiboImporter(),
  new QQZoneImporter(),
  new WechatMomentsImporter(),
  new YiyanImporter(),
  new FileImporter(),
];
