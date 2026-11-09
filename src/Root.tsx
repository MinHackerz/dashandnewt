import { Composition, Folder, Still } from "remotion";
import { Saved } from "./episodes/ep07-saved/Saved";
import { DURATION as SAVED_DURATION } from "./episodes/ep07-saved/timeline";
import { UmbrellaDuty } from "./episodes/ep08-umbrella-duty/UmbrellaDuty";
import { DURATION as UMBRELLA_DURATION } from "./episodes/ep08-umbrella-duty/timeline";
import { BigBounce } from "./episodes/ep09-big-bounce/BigBounce";
import { DURATION as BOUNCE_DURATION } from "./episodes/ep09-big-bounce/timeline";
import { OneFlare } from "./episodes/ep10-one-flare/OneFlare";
import { DURATION as FLARE_DURATION } from "./episodes/ep10-one-flare/timeline";
import { CastSheet } from "./rig2d/CastSheet";
import { ChannelAvatar, ChannelBanner, ChannelBannerSafeArea } from "./channel/ChannelArt";
import { TheButton } from "./episodes/ep01-the-button/TheButton";
import { FiveMoreMinutes } from "./episodes/ep02-five-more-minutes/FiveMoreMinutes";
import { TheShortcut } from "./episodes/ep03-the-shortcut/TheShortcut";
import { TheBoulder } from "./episodes/ep04-the-boulder/TheBoulder";
import { DURATION as BOULDER_DURATION } from "./episodes/ep04-the-boulder/timeline";
import { SpacedOut } from "./episodes/ep05-spaced-out/SpacedOut";
import { DURATION as SPACE_DURATION } from "./episodes/ep05-spaced-out/timeline";
import { TheJar } from "./episodes/ep06-the-jar/TheJar";
import { DURATION as JAR_DURATION } from "./episodes/ep06-the-jar/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TheButton"
        component={TheButton}
        durationInFrames={45 * 30}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiveMoreMinutes"
        component={FiveMoreMinutes}
        durationInFrames={Math.round(34.5 * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TheShortcut"
        component={TheShortcut}
        durationInFrames={38 * 30}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TheBoulder"
        component={TheBoulder}
        durationInFrames={Math.round(BOULDER_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SpacedOut"
        component={SpacedOut}
        durationInFrames={Math.round(SPACE_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TheJar"
        component={TheJar}
        durationInFrames={Math.round(JAR_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Saved"
        component={Saved}
        durationInFrames={Math.round(SAVED_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="UmbrellaDuty"
        component={UmbrellaDuty}
        durationInFrames={Math.round(UMBRELLA_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BigBounce"
        component={BigBounce}
        durationInFrames={Math.round(BOUNCE_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OneFlare"
        component={OneFlare}
        durationInFrames={Math.round(FLARE_DURATION * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Folder name="Rig2D">
        <Still id="CastSheet" component={CastSheet} width={1080} height={1920} />
      </Folder>
      <Folder name="Channel">
        <Still id="ChannelAvatar" component={ChannelAvatar} width={800} height={800} />
        <Still id="ChannelBanner" component={ChannelBanner} width={2560} height={1440} />
        <Still id="ChannelBannerSafeArea" component={ChannelBannerSafeArea} width={2560} height={1440} />
      </Folder>
    </>
  );
};
