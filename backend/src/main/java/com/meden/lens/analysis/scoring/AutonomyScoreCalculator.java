package com.meden.lens.analysis.scoring;

import org.springframework.stereotype.Component;

@Component
public class AutonomyScoreCalculator {

    public int score(boolean allowSubAgents, int subAgentCount) {
        if (allowSubAgents || subAgentCount == 0) {
            return 100;
        }
        if (subAgentCount == 1) {
            return 50;
        }
        return 10;
    }
}
