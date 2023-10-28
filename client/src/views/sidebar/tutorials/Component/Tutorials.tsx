import { FC, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import TutorialsSkeleton from "./TutorialsSkeleton";
import Text from "../../../../components/Text";
import {
  PgCommon,
  PgRouter,
  PgTutorial,
  PgView,
  TutorialData,
  TutorialMetadata,
} from "../../../../utils/pg";
import { useAsyncEffect } from "../../../../hooks";

type TutorialFullData = (TutorialData & TutorialMetadata)[];
type TutorialsData = { completed: TutorialFullData; ongoing: TutorialFullData };

const Tutorials = () => {
  const [tutorialsData, setTutorialsData] = useState<TutorialsData>();

  // Handle path
  useAsyncEffect(async () => {
    const TUTORIALS_PATH: RoutePath = "/tutorials";
    const { pathname } = await PgRouter.getLocation();
    if (!pathname.startsWith(TUTORIALS_PATH)) {
      await PgRouter.navigate(TUTORIALS_PATH);
    }

    // This will fix the case where going back from `/tutorials` to `/` with
    // browser's navigations would cause this component to be still mounted
    // instead of switching to `Explorer`
    const { dispose } = PgRouter.onDidChangePath((path) => {
      if (!path.startsWith(TUTORIALS_PATH)) {
        PgView.setSidebarPage((state) => {
          if (state === "Tutorials") return "Explorer";
          return state;
        });
      }
    });
    return () => dispose();
  }, []);

  // Get tutorial data
  useAsyncEffect(async () => {
    // Better transition
    const data = await PgCommon.transition(async () => {
      const tutorialNames = await PgCommon.tryUntilSuccess(
        () => PgTutorial.getUserTutorialNames(),
        100
      );
      const data: TutorialsData = { completed: [], ongoing: [] };
      for (const tutorialName of tutorialNames) {
        const tutorialData = PgTutorial.getTutorialData(tutorialName);
        if (!tutorialData) continue;

        const tutorialMetadata = await PgTutorial.getMetadata(tutorialName);
        const tutorialFullData = { ...tutorialData, ...tutorialMetadata };
        if (tutorialMetadata.completed) data.completed.push(tutorialFullData);
        else data.ongoing.push(tutorialFullData);
      }

      return data;
    });

    setTutorialsData(data);
  }, []);

  if (!tutorialsData) return <TutorialsSkeleton />;

  return (
    <Wrapper>
      {!tutorialsData.ongoing.length && !tutorialsData.completed.length && (
        <Text>Choose and start a new tutorial to track your progress.</Text>
      )}
      <TutorialGroup name="Ongoing" data={tutorialsData.ongoing} />
      <TutorialGroup name="Completed" data={tutorialsData.completed} />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  ${({ theme }) => css`
    padding: 1.5rem 1rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

interface TutorialGroupProps {
  name: string;
  data: TutorialFullData;
}

const TutorialGroup: FC<TutorialGroupProps> = ({ name, data }) => (
  <>
    {data.length > 0 && (
      <TutorialsSectionHeader>
        {name} -&gt; <Bold>{data.length}</Bold>
      </TutorialsSectionHeader>
    )}
    {data.map((t, i) => (
      <TutorialWrapper
        key={i}
        onClick={() => PgTutorial.open(t.name)}
        progress={t.completed ? 100 : ((t.pageNumber - 1) / t.pageCount) * 100}
      >
        <TutorialName>{t.name}</TutorialName>
      </TutorialWrapper>
    ))}
  </>
);

const TutorialsSectionHeader = styled.div`
  font-size: ${({ theme }) => theme.font.code.size.large};

  &:not(:first-child) {
    margin-top: 2rem;
  }
`;

const Bold = styled.span`
  font-weight: bold;
`;

const TutorialWrapper = styled.div<{ progress: number }>`
  ${({ theme, progress }) => css`
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: ${theme.components.sidebar.right.default.otherBg};
    border-radius: ${theme.default.borderRadius};
    box-shadow: ${theme.default.boxShadow};
    transition: all ${theme.default.transition.duration.medium}
      ${theme.default.transition.type};
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      height: 0.125rem;
      background: ${progress === 100
        ? `linear-gradient(90deg, ${theme.colors.state.success.color} 0%, ${
            theme.colors.state.success.color + theme.default.transparency.high
          } 100%)`
        : `linear-gradient(90deg, ${theme.colors.default.primary} 0%, ${theme.colors.default.secondary} 100%)`};
      animation: ${animateWidth(progress)}
        ${theme.default.transition.duration.long}
        ${theme.default.transition.type} forwards;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
      cursor: pointer;
    }
  `}
`;

const animateWidth = (progress: number) =>
  keyframes`
    from {
      width: 0;
    }
    to {
      width: ${progress}%;
    }
`;

const TutorialName = styled.div`
  font-weight: bold;
`;

export default Tutorials;
