package com.meden.lens.analysis.scoring;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
@ConfigurationProperties(prefix = "meden.scoring")
public class ScoringProperties {

    private double costWeight = 0.25;
    private double tokenWeight = 0.20;
    private double toolWeight = 0.15;
    private double modelCallWeight = 0.15;
    private double latencyWeight = 0.10;
    private double retryWeight = 0.10;
    private double autonomyWeight = 0.05;
    private double insufficientExecutionTokenRatio = 0.25;

    @PostConstruct
    void validateWeights() {
        double total = costWeight
            + tokenWeight
            + toolWeight
            + modelCallWeight
            + latencyWeight
            + retryWeight
            + autonomyWeight;

        if (Math.abs(total - 1.0) > 0.000001) {
            throw new IllegalStateException("Meden scoring weights must sum to 1.0.");
        }
    }

    public double getCostWeight() {
        return costWeight;
    }

    public void setCostWeight(double costWeight) {
        this.costWeight = costWeight;
    }

    public double getTokenWeight() {
        return tokenWeight;
    }

    public void setTokenWeight(double tokenWeight) {
        this.tokenWeight = tokenWeight;
    }

    public double getToolWeight() {
        return toolWeight;
    }

    public void setToolWeight(double toolWeight) {
        this.toolWeight = toolWeight;
    }

    public double getModelCallWeight() {
        return modelCallWeight;
    }

    public void setModelCallWeight(double modelCallWeight) {
        this.modelCallWeight = modelCallWeight;
    }

    public double getLatencyWeight() {
        return latencyWeight;
    }

    public void setLatencyWeight(double latencyWeight) {
        this.latencyWeight = latencyWeight;
    }

    public double getRetryWeight() {
        return retryWeight;
    }

    public void setRetryWeight(double retryWeight) {
        this.retryWeight = retryWeight;
    }

    public double getAutonomyWeight() {
        return autonomyWeight;
    }

    public void setAutonomyWeight(double autonomyWeight) {
        this.autonomyWeight = autonomyWeight;
    }

    public double getInsufficientExecutionTokenRatio() {
        return insufficientExecutionTokenRatio;
    }

    public void setInsufficientExecutionTokenRatio(double insufficientExecutionTokenRatio) {
        this.insufficientExecutionTokenRatio = insufficientExecutionTokenRatio;
    }
}
